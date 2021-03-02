/*
 * CloudBeaver - Cloud Database Manager
 * Copyright (C) 2020-2021 DBeaver Corp and others
 *
 * Licensed under the Apache License, Version 2.0.
 * you may not use this file except in compliance with the License.
 */

import { makeObservable, observable } from 'mobx';

import { injectable } from '@cloudbeaver/core-di';
import { Executor, ExecutorInterrupter, IExecutor, IExecutorHandler } from '@cloudbeaver/core-executor';

import { NavigationService } from './NavigationService';

@injectable()
export class OptionsPanelService {
  active: boolean;
  readonly closeTask: IExecutor;

  panelComponent: (() => React.FC) | null;

  constructor(
    private navigationService: NavigationService
  ) {
    makeObservable(this, {
      active: observable,
      panelComponent: observable,
    });
    this.active = false;
    this.panelComponent = null;
    this.closeTask = new Executor();
    this.navigationService.navigationTask.addHandler(this.navigationHandler);
  }

  getPanelComponent(): React.FC {
    if (this.panelComponent === null) {
      return () => null;
    }
    return this.panelComponent();
  }

  async open(component: () => React.FC): Promise<void> {
    if (component === this.panelComponent) {
      return;
    }

    if (!(await this.close())) {
      return;
    }

    this.panelComponent = component;
    this.active = true;
  }

  async close(): Promise<boolean> {
    if (this.panelComponent === null) {
      return true;
    }

    const contexts = await this.closeTask.execute();

    const interrupted = contexts.getContext(ExecutorInterrupter.interruptContext);

    if (interrupted.interrupted) {
      return false;
    }

    this.panelComponent = null;
    this.active = false;
    return true;
  }

  private navigationHandler: IExecutorHandler<any> = async (data, contexts) => {
    const state = await this.close();

    if (!state) {
      ExecutorInterrupter.interrupt(contexts);
    }
  };
}
