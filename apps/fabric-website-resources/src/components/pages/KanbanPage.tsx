import * as React from 'react';

import { KanbanPageProps } from '../../../../../../office-ui-fabric-react/packages/office-ui-fabric-react/src/components/Kanban/Kanban.doc';
import { DemoPage } from '../DemoPage';

export const KanbanPage = (props: { isHeaderVisible: boolean }) => <DemoPage {...{ ...KanbanPageProps, ...props }} />;
