// Copyright 2018 Google Inc
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Component, OnInit, Inject, forwardRef } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { plainToClass } from 'class-transformer';
import { Pipeline } from 'app/models/pipeline';
import { PipelinesService } from './shared/pipelines.service';
import { AppComponent } from 'app/app.component';

@Component({
  selector: 'app-pipelines',
  templateUrl: './pipelines.component.html',
  styleUrls: ['./pipelines.component.sass']
})
export class PipelinesComponent implements OnInit {

  pipelines: Pipeline[] = [];
  displayedPipelines: Pipeline[] = [];
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 0;
  totalPipelines: number = 0;
  filesToUpload: Array<File> = [];
  filterText: string = '';
  state: 'loading' | 'loaded' | 'error' = 'loading';

  private requestCounter = 0;

  constructor(
    private pipelinesService: PipelinesService,
    @Inject(forwardRef(() => AppComponent)) private appComponent: AppComponent
  ) { }

  ngOnInit() {
    this.loadPipelines(this.currentPage, this.itemsPerPage);
  }

  loadPipelines(page: number, itemsPerPage: number) {
    this.state = 'loading';
    const currentRequestId = ++this.requestCounter;
    this.pipelinesService.getPipelines(page, itemsPerPage, this.filterText).then(
      (response: any) => {
        if (currentRequestId === this.requestCounter) {
          console.log('Raw API response:', response);
          if (response && Array.isArray(response.pipelines)) {
            this.pipelines = response.pipelines.map(
              pipelineData => new Pipeline(pipelineData));
            this.displayedPipelines = this.pipelines;
            this.totalPipelines = response.total || 0;
            this.totalPages = Math.ceil(
              this.totalPipelines / this.itemsPerPage);
            this.currentPage = response.page;
            this.itemsPerPage = response.itemsPerPage;
            this.state = 'loaded';
          } else {
            console.error('Unexpected response structure:', response);
            this.state = 'error';
          }
        }
      },
      error => {
        if (currentRequestId === this.requestCounter) {
          console.error('Error loading pipelines:', error);
          this.state = 'error';
        }
      }
    );
  }

  /**
   * Generic method to reset the pipeline data.
   * @param showLoader: Whether or not to show the loader during the reset.
   */
  resetPipelineData() {
    this.currentPage = 1;
    this.loadPipelines(this.currentPage, this.itemsPerPage);
  }

  onFilterChange() {
    this.resetPipelineData();
  }

  onPageChange(event: PageEvent) {
    this.loadPipelines(event.pageIndex + 1, event.pageSize);
  }

  deletePipeline(pipeline) {
    if (confirm(`Are you sure you want to delete ${pipeline.name}?`)) {
      const index = this.pipelines.indexOf(pipeline);
      this.pipelines.splice(index, 1);

      this.pipelinesService.deletePipeline(pipeline.id)
          .catch(err => {
            console.log('error', err);
            const defaultMessage = 'Could not delete pipeline.';
            let message;
            try {
              message = JSON.parse(err._body).message || defaultMessage;
            } catch (e) {
              message = defaultMessage;
            }

            this.appComponent.addAlert(message);
            // Revert the view back to its original state
            this.pipelines.splice(index, 0, pipeline);
          });
    }
  }

  importPipeline(data) {
    this.pipelinesService.importPipeline(data.target.files[0])
                         .then(pipeline => this.pipelines.push(plainToClass(Pipeline, pipeline as Pipeline)));
  }

}
