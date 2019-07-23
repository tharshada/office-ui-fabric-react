import * as React from 'react';
import { ILaneColumn } from '../KanbanBoard.types';
import { mergeStyleSets } from 'office-ui-fabric-react/lib/Styling';
import { KanbanBoard } from '../KanbanBoard';

interface IKanbanBoardExampleItem {
  col: string;
  otherColumn: string;
  color: string;
  location: string;
}
const classNamesExample = mergeStyleSets({
  wrapper: {
    position: 'relative',
    overflow: 'hidden',
    height: '40vh'
  },
  laneItemBorder: {
    border: '1px solid black',
    padding: '5px',
    margin: '5px'
  }
});

export class KanbanBoardExample extends React.Component {
  private _laneColumns: ILaneColumn[];
  private _numberOfColumns: number;
  private _items: IKanbanBoardExampleItem[];
  private _numberOfItems = 100;
  private _colors = ['#05ffb0', '#EA4300', '#959595', '#008877'];
  private _location: string[] = [
    'Seattle',
    'New York',
    'Chicago',
    'Los Angeles',
    'Portland',
    'Amherst',
    'Philadelphia',
    'Hawaii',
    'San Francisco',
    'Los Angels',
    'Las Vegas',
    'Denver',
    'New Jersey',
    'New Orleans',
    'Albaquerque',
    'Manhatten',
    'Miami',
    'Boston',
    'Long Island',
    'Nashville',
    'Memphis',
    'Kansas City',
    'Houston'
  ];
  private _locationCount: number;
  constructor(props: any) {
    super(props);
    this._locationCount = this._location.length;
    this._items = Array.from(new Array(this._numberOfItems).keys()).map(i => {
      const location = this._getLocation();
      return {
        location,
        color: this._colors[i % this._colors.length],
        col: location,
        otherColumn: 'value column ' + i
      };
    });
    this._numberOfColumns = this._locationCount;
    this._laneColumns = [];
    for (let i = 0; i < this._numberOfColumns; i++) {
      this._laneColumns.push({
        name: this._location[i],
        key: 'columnValue' + i
      });
    }
    this.state = {
      items: this._items
    };
  }
  public render() {
    return (
      <div className={classNamesExample.wrapper} data-is-scrollable={true}>
        <KanbanBoard laneColumns={this._laneColumns} getItems={this._getItems} onRenderLaneItem={this._onRenderLaneItem} />
      </div>
    );
  }
  private _getLocation = () => {
    return this._location[parseInt('' + Math.random() * this._locationCount, 10)];
  };
  private _getItems = (laneColumn: ILaneColumn) => {
    return (
      this._items &&
      this._items.filter(item => {
        return item.col === laneColumn.name;
      })
    );
  };
  private _onRenderLaneItem(item?: IKanbanBoardExampleItem, index?: number) {
    console.log('on render item');
    return (
      <div className={classNamesExample.laneItemBorder} style={{ background: item!.color }}>
        <div>{item!.col}</div>
        <div>{item!.otherColumn}</div>
      </div>
    );
  }
}
