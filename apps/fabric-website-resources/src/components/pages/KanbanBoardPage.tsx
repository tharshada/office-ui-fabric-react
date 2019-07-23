import * as React from 'react';

import { KanbanBoardPageProps } from 'office-ui-fabric-react/src/components/KanbanBoard/KanbanBoard.doc';
import { DemoPage } from '../DemoPage';

export const KanbanBoardPage = (props: { isHeaderVisible: boolean }) => <DemoPage {...{ ...KanbanBoardPageProps, ...props }} />;
