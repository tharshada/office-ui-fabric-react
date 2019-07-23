import * as React from 'react';

import { KanbanPageProps } from 'office-ui-fabric-react/src/components/KanbanBoard/KanbanBoard.doc';
import { DemoPage } from '../DemoPage';

export const KanbanPage = (props: { isHeaderVisible: boolean }) => <DemoPage {...{ ...KanbanPageProps, ...props }} />;
