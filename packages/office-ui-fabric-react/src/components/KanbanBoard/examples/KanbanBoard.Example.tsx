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
    borderRadius: 5,
    padding: '5px',
    margin: '5px'
  }
});

export class KanbanBoardExample extends React.Component {
  private _laneColumns: ILaneColumn[];
  private _numberOfColumns: number;
  private _numberOfItems = 100;
  private _colors = ['#05ffb0', '#EA4300', '#959595', '#008877'];
  private _colorCount: number;
  private _locations: string[] = [
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
    this._colorCount = this._colors.length;
    this._locationCount = this._locations.length;
    this._numberOfColumns = this._locationCount;
    this._laneColumns = [];
    for (let i = 0; i < this._numberOfColumns; i++) {
      this._laneColumns.push({
        name: this._locations[i],
        key: 'columnValue' + i
      });
    }
  }
  public render() {
    return (
      <div className={classNamesExample.wrapper} data-is-scrollable={true}>
        <KanbanBoard laneColumns={this._laneColumns} getItems={this._getItems} onRenderLaneItem={this._onRenderLaneItem} />
      </div>
    );
  }
  private _getRandom = (key: string) => {
    return this[`_${key}s`][parseInt('' + Math.random() * this[`_${key}Count`], 10)];
  };

  private _getItems = (itemsCount: number = this._numberOfItems, laneColumn?: ILaneColumn) => {
    console.log('======>', itemsCount);
    return Array.from(new Array(itemsCount).keys()).map(i => {
      const location = laneColumn ? laneColumn.name : this._getRandom('location');
      return {
        location,
        color: this._getRandom('color'),
        col: location,
        otherColumn: 'value column ' + i
      };
    });
  };
  private _onRenderLaneItem(item?: IKanbanBoardExampleItem, index?: number) {
    return (
      <div className={classNamesExample.laneItemBorder} style={{ background: item!.color }}>
        <div>{item!.col}</div>
        {/* <div>{item!.otherColumn}</div> */}
      </div>
    );
  }
}
