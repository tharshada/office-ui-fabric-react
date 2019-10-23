import { IScrollablePaneStyleProps, IScrollablePaneStyles } from './ScrollablePane.types';
import { HighContrastSelector, IStyle, getGlobalClassNames } from '../../Styling';

const GlobalClassNames = {
  root: 'ms-ScrollablePane',
  contentContainer: 'ms-ScrollablePane--contentContainer'
};

export const getStyles = (props: IScrollablePaneStyleProps): IScrollablePaneStyles => {
  const classNames = getGlobalClassNames(GlobalClassNames, props.theme);

  const AboveAndBelowStyles: IStyle = {
    position: 'absolute',
    pointerEvents: 'auto'
  };

  const positioningStyle: IStyle = {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    WebkitOverflowScrolling: 'touch'
  };
  const borderCSS = '1px solid WindowText';
  return {
    root: [classNames.root, props.theme.fonts.medium, positioningStyle, props.className],
    contentContainer: [
      classNames.contentContainer,
      {
        overflowY: props.scrollbarVisibility === 'always' ? 'scroll' : 'auto'
      },
      positioningStyle
    ],
    stickyAbove: [
      {
        top: 0,
        selectors: {
          [HighContrastSelector]: {
            borderBottom: borderCSS
          }
        }
      },
      AboveAndBelowStyles
    ],
    stickyBelow: [
      {
        bottom: 0,
        selectors: {
          [HighContrastSelector]: {
            borderTop: borderCSS
          }
        }
      },
      AboveAndBelowStyles
    ],
    stickyBelowItems: [
      {
        bottom: 0
      },
      AboveAndBelowStyles,
      {
        width: '100%'
      }
    ]
  };
};
