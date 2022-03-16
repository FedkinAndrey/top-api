import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode, Logger,
	NotFoundException,
	Param,
	Patch,
	Post, UseGuards,
	UsePipes, ValidationPipe,
} from '@nestjs/common';
import { FindTopPageDto } from './dto/find-top-page.dto';
import { TopPageService } from './top-page.service';
import { CreateTopPageDto } from './dto/create-top-page.dto';
import { TOP_PAGE_NOT_FOUND_ERROR } from './top-page.constants';
import { IdValidationPipe } from '../pipes/id-validation.pipe';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { HhService } from '../hh/hh.service';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';

@Controller('top-page')
export class TopPageController {
	constructor(
		private readonly topPageService: TopPageService,
		private readonly hhService: HhService,
		private readonly schedulerRegistry: SchedulerRegistry,
	) {
	}

	@UseGuards(JwtGuard)
	@Post('create')
	async create(@Body() dto: CreateTopPageDto) {
		return this.topPageService.create(dto);
	}

	@UseGuards(JwtGuard)
	@Get(':id')
	async get(@Param('id', IdValidationPipe) id: string) {
		const page = await this.topPageService.findById(id);
		if (!page) {
			throw new NotFoundException(TOP_PAGE_NOT_FOUND_ERROR);
		}
		return page;
	}

	@Get('byAlias/:alias')
	async getByAlias(@Param('alias') alias: string) {
		const page = await this.topPageService.findByAlias(alias);
		if (!page) {
			throw new NotFoundException(TOP_PAGE_NOT_FOUND_ERROR);
		}
		return page;
	}

	@UseGuards(JwtGuard)
	@Delete(':id')
	async delete(@Param('id', IdValidationPipe) id: string) {
		const deletedPage = await this.topPageService.deleteById(id);
		if (!deletedPage) {
			throw new NotFoundException(TOP_PAGE_NOT_FOUND_ERROR);
		}
	}

	@UseGuards(JwtGuard)
	@Patch(':id')
	async patch(@Param('id', IdValidationPipe) id: string, @Body() dto: CreateTopPageDto) {
		const updatedPage = await this.topPageService.updateById(id, dto);
		if (!updatedPage) {
			throw new NotFoundException(TOP_PAGE_NOT_FOUND_ERROR);
		}
		return updatedPage;
	}

	@UsePipes(new ValidationPipe())
	@HttpCode(200)
	@Post('find')
	async find(@Body() dto: FindTopPageDto) {
		return this.topPageService.findByCategory(dto.firstCategory);
	}

	@Get('textSearch/:text')
	async textSearch(@Param('text') text: string) {
		return this.topPageService.findByText(text);
	}

	@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { name: 'test' })
	async test() {
		const job = this.schedulerRegistry.getCronJob('test');
		const data = await this.topPageService.findForHhUpdate(new Date());
		for (const page of data) {
			const hhData = await this.hhService.getData(page.category);
			Logger.log(hhData);
			page.hh = hhData;
			await this.topPageService.updateById(page._id, page);
		}
	}
}
