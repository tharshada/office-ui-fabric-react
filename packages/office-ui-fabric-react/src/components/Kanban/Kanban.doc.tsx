import * as React from 'react';
import { IDocPageProps } from '../../common/DocPage.types';
import { KanbanBasicExample } from './examples/Kanban.Basic.Example';

const KanbanBasicExampleCode = require('!raw-loader!office-ui-fabric-react/src/components/Kanban/examples/Kanban.Basic.Example.tsx') as string;

export const KanbanPageProps: IDocPageProps = {
  title: 'Kanban',
  componentName: 'KanbanExample',
  componentUrl: 'https://github.com/OfficeDev/office-ui-fabric-react/tree/master/packages/office-ui-fabric-react/src/components/List',
  examples: [
    {
      title: 'Kanban of 50 grid items',
      code: KanbanBasicExampleCode,
      view: <KanbanBasicExample />
    }
  ],

  allowNativeProps: true,
  overview: require<string>('!raw-loader!office-ui-fabric-react/src/components/Kanban/docs/KanbanOverview.md'),
  isHeaderVisible: true,
  isFeedbackVisible: true
};
