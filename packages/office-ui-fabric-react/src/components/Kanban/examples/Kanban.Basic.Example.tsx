import * as React from 'react';
import { Kanban } from '../Kanban';
import { ILaneColumn } from '../Kanban.types';
import { createListItems } from '../../../utilities/exampleData';

export class KanbanBasicExample extends React.Component {
  private _cachedItems: any;
  constructor(props: any) {
    super(props);
    this._cachedItems = createListItems(100);
  }

  public render() {
    const names = ['A', 'B', 'C', 'D', 'E'];
    const laneColumns: ILaneColumn[] = names.map(name => {
      return {
        name,
        key: name,
        width: 10
      };
    });
    return (
      <Kanban
        laneColumns={laneColumns}
        items={this._cachedItems.map((item: any, i: number) => {
          return { ...item, status: names[i % names.length] };
        })}
        onRenderLaneItem={this.onRenderCell}
      />
    );
  }

  private onRenderCell(item: any, index: number): JSX.Element {
    return (
      <div style={{ margin: 10, border: '1px dashed', backgroundColor: item.color, textAlign: 'center' }}>
        <div>{index}</div>
        <div>{item.shape}</div>
        <div>{item.location + ' ' + item.location + ' ' + item.location}</div>
      </div>
    );
  }
}
