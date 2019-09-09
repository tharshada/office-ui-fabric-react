import * as PropTypes from 'prop-types';
import * as React from 'react';
import { BaseComponent } from '../../Utilities';
import { IScrollablePaneContext, ScrollablePaneContext } from '../ScrollablePane/ScrollablePane.types';
import { IStickyProps, StickyPositionType } from './Sticky.types';

export interface IStickyState {
  isStickyTop: boolean;
  isStickyBottom: boolean;
  distanceFromTop?: number;
}

export interface IStickyContext {
  scrollablePane: PropTypes.Requireable<object>;
}

export class Sticky extends BaseComponent<IStickyProps, IStickyState> {
  public static defaultProps: IStickyProps = {
    stickyPosition: StickyPositionType.Both,
    isScrollSynced: true
  };

  public static contextType = ScrollablePaneContext;

  private _root = React.createRef<HTMLDivElement>();
  private _stickyContentTop = React.createRef<HTMLDivElement>();
  private _stickyContentBottom = React.createRef<HTMLDivElement>();
  private _nonStickyContent = React.createRef<HTMLDivElement>();
  private _placeHolder = React.createRef<HTMLDivElement>();
  private _activeElement: HTMLElement | undefined;

  constructor(props: IStickyProps) {
    super(props);
    this.state = {
      isStickyTop: false,
      isStickyBottom: false,
      distanceFromTop: undefined
    };
    this._activeElement = undefined;
  }

  public get root(): HTMLDivElement | null {
    return this._root.current;
  }

  public get placeholder(): HTMLDivElement | null {
    return this._placeHolder.current;
  }

  public get stickyContentTop(): HTMLDivElement | null {
    return this._stickyContentTop.current;
  }

  public get stickyContentBottom(): HTMLDivElement | null {
    return this._stickyContentBottom.current;
  }

  public get nonStickyContent(): HTMLDivElement | null {
    return this._nonStickyContent.current;
  }

  public get canStickyTop(): boolean {
    return this.props.stickyPosition === StickyPositionType.Both || this.props.stickyPosition === StickyPositionType.Header;
  }

  public get canStickyBottom(): boolean {
    return this.props.stickyPosition === StickyPositionType.Both || this.props.stickyPosition === StickyPositionType.Footer;
  }

  public syncScroll = (container: HTMLElement): void => {
    const { nonStickyContent, stickyContentTop, stickyContentBottom } = this;
    const { isStickyBottom, isStickyTop } = this.state;
    const { scrollablePane } = this.context;
    // scroll sync is needed only if current state is sticky
    if (!scrollablePane || !this.props.isScrollSynced || !(isStickyBottom || isStickyTop)) {
      return;
    }
    const containerScrollLeft = scrollablePane.getHorizontalScrollPosition();
    const usePlaceholderForSticky = !scrollablePane.optimizeForPerformace();
    const stickyContent = isStickyTop ? stickyContentTop : stickyContentBottom;
    if (!usePlaceholderForSticky && stickyContent && stickyContent.children && stickyContent.children.length > 0) {
      stickyContent.children[0].scrollLeft = containerScrollLeft;
    } else if (nonStickyContent) {
      nonStickyContent.scrollLeft = containerScrollLeft;
    }
  };

  public componentDidMount(): void {
    const { scrollablePane } = this._getContext();

    if (!scrollablePane) {
      return;
    }

    scrollablePane.subscribe(this._onScrollEvent);
    scrollablePane.addSticky(this);
  }

  public componentWillUnmount(): void {
    const { scrollablePane } = this._getContext();

    if (!scrollablePane) {
      return;
    }

    scrollablePane.unsubscribe(this._onScrollEvent);
    scrollablePane.removeSticky(this);
  }

  public componentDidUpdate(prevProps: IStickyProps, prevState: IStickyState): void {
    const { scrollablePane } = this._getContext();

    if (!scrollablePane) {
      return;
    }

    const { isStickyBottom, isStickyTop, distanceFromTop } = this.state;
    if (prevState.distanceFromTop !== distanceFromTop) {
      scrollablePane.sortSticky(this, true /*sortAgain*/);
    }
    if (prevState.isStickyTop !== isStickyTop || prevState.isStickyBottom !== isStickyBottom) {
      if (this._activeElement) {
        this._activeElement.focus();
      }
      scrollablePane.updateStickyRefHeights();
    }
    if (scrollablePane.getUserInteractionStatus()) {
      // Sync Sticky scroll position with content container on each update
      scrollablePane.syncScrollSticky(this);
    }
  }

  public shouldComponentUpdate(nextProps: IStickyProps, nextState: IStickyState): boolean {
    if (!this.context.scrollablePane) {
      return true;
    }

    const { isStickyTop, isStickyBottom, distanceFromTop } = this.state;

    return (isStickyTop !== nextState.isStickyTop ||
      isStickyBottom !== nextState.isStickyBottom ||
      this.props.stickyPosition !== nextProps.stickyPosition ||
      this.props.children !== nextProps.children ||
      distanceFromTop !== nextState.distanceFromTop ||
      this._isOffsetHeightDifferent()) as boolean;
  }

  public render(): JSX.Element {
    const state = this.state;
    const { isStickyTop, isStickyBottom } = state;
    const { stickyClassName, children, stickyBackgroundColor } = this.props;
    const scrollablePaneContext = this.context ? this.context.scrollablePane : undefined;
    if (!scrollablePaneContext) {
      return <div>{this.props.children}</div>;
    }
    const canStickyTop = this.canStickyTop;
    const canStickyBottom = this.canStickyBottom;
    const nonStickyContent = this.nonStickyContent;
    return (
      <div ref={this._root}>
        {canStickyTop && this._getStickyContent(StickyPositionType.Header, isStickyTop)}
        {canStickyBottom && this._getStickyContent(StickyPositionType.Footer, isStickyBottom)}
        <div
          style={_getNonStickyPlaceholderHeightAndWidth(
            {
              state,
              canStickyTop,
              canStickyBottom,
              nonStickyContent
            },
            scrollablePaneContext.optimizeForPerformace()
          )}
          ref={this._placeHolder}
        >
          <div
            ref={this._nonStickyContent}
            className={isStickyTop || isStickyBottom ? stickyClassName : undefined}
            style={_getContentStyles(isStickyTop || isStickyBottom, this.root, stickyBackgroundColor)}
          >
            {children}
          </div>
        </div>
      </div>
    );
  }

  public addSticky(stickyContent: HTMLDivElement): void {
    const placeholderUsedForStickyContent = _usePlaceHolderForSticky(this.context.scrollablePane.optimizeForPerformace(), true);
    if (placeholderUsedForStickyContent && this.nonStickyContent) {
      stickyContent.appendChild(this.nonStickyContent);
    }
  }

  public resetSticky(): void {
    const placeholderUsedForStickyContent = _usePlaceHolderForSticky(this.context.scrollablePane.optimizeForPerformace(), true);
    if (placeholderUsedForStickyContent && this.nonStickyContent && this.placeholder) {
      this.placeholder.appendChild(this.nonStickyContent);
    }
  }

  public setDistanceFromTop(container: HTMLDivElement): void {
    const distanceFromTop = _getNonStickyDistanceFromTop(container, this.root);
    this.setState({ distanceFromTop: distanceFromTop });
  }

  private _getStickyContent(stickyPositionType: StickyPositionType, isSticky: boolean): JSX.Element {
    const { stickyClassName, children } = this.props;
    const { scrollablePane } = this.context;
    // decide if actual element is to be replicated or placeholder is be to used.
    const usePlaceholderForStickyContent = !scrollablePane.optimizeForPerformace();
    return (
      <div
        ref={stickyPositionType === StickyPositionType.Header ? this._stickyContentTop : this._stickyContentBottom}
        aria-hidden={!isSticky}
        style={{ pointerEvents: isSticky ? 'auto' : 'none' }}
      >
        {usePlaceholderForStickyContent ? (
          <div style={_getStickyPlaceholderHeight(isSticky, this.nonStickyContent)} />
        ) : (
          <div className={isSticky ? stickyClassName : undefined} style={_getStickyContentStyles(isSticky, this.props, this.root)}>
            {children}
          </div>
        )}
      </div>
    );
  }

  private _getContext = (): IScrollablePaneContext => this.context;

  private _isOffsetHeightDifferent(): boolean {
    const { scrollablePane } = this.context;
    if (!scrollablePane) {
      return false;
    }
    const usePlaceholderForStickyContentTop = _usePlaceHolderForSticky(scrollablePane.optimizeForPerformace(), this.canStickyTop);
    const usePlaceholderForStickyContentBottom = _usePlaceHolderForSticky(scrollablePane.optimizeForPerformace(), this.canStickyBottom);
    return (
      (usePlaceholderForStickyContentTop && _isOffsetHeightDifferent(this._nonStickyContent, this._stickyContentTop)) ||
      (usePlaceholderForStickyContentBottom && _isOffsetHeightDifferent(this._nonStickyContent, this._stickyContentBottom)) ||
      ((usePlaceholderForStickyContentBottom || usePlaceholderForStickyContentTop) &&
        _isOffsetHeightDifferent(this._nonStickyContent, this._placeHolder))
    );
  }

  private _onScrollEvent = (container: HTMLElement, footerStickyContainer: HTMLElement): void => {
    const { scrollablePane } = this.context;
    if (!this.root || !this.nonStickyContent || !scrollablePane) {
      return;
    }
    const perfOptimization = scrollablePane.optimizeForPerformance();
    if (perfOptimization && this.canStickyBottom) {
      // 1. ScrollablePane is mounted and has called notifySubscriber
      // 2. stickyAlways has to re-render if mutation could 've affected it's offsetHeight.
      this.setState({
        isStickyTop: false,
        isStickyBottom: true,
        distanceFromTop: 0 // must so that sorting happens.
      });
    } else if (perfOptimization && this.canStickyTop && scrollablePane.getUserInteractionStatus()) {
      // user interaction has not started
      // 1. ScrollablePane is mounted and has called notifySubscriber, sort is required.
      // 2. StickyOnScroll has to re-render if mutation could 've affected it's offsetHeight.
      const { isStickyBottom, isStickyTop } = this.state;
      scrollablePane.sortSticky(this, false);
      this.setState({
        isStickyBottom: isStickyBottom,
        isStickyTop: isStickyTop
      });
    } else {
      const distanceFromTop = _getNonStickyDistanceFromTop(container, this.root);
      let isStickyTop = false;
      let isStickyBottom = false;

      if (this.canStickyTop) {
        const distanceToStickTop = distanceFromTop - _getStickyDistanceFromTop(this.stickyContentTop);
        isStickyTop = distanceToStickTop < container.scrollTop;
      }

      // Can sticky bottom if the scrollablePane - total sticky footer height is smaller than the sticky's distance from the top of the pane
      if (this.canStickyBottom && container.clientHeight - footerStickyContainer.offsetHeight <= distanceFromTop) {
        isStickyBottom =
          distanceFromTop - Math.floor(container.scrollTop) >=
          _getStickyDistanceFromTopForFooter(container, footerStickyContainer, this.stickyContentBottom);
      }

      if (
        document.activeElement &&
        this.nonStickyContent.contains(document.activeElement) &&
        (this.state.isStickyTop !== isStickyTop || this.state.isStickyBottom !== isStickyBottom)
      ) {
        this._activeElement = document.activeElement as HTMLElement;
      } else {
        this._activeElement = undefined;
      }

      this.setState({
        isStickyTop: this.canStickyTop && isStickyTop,
        isStickyBottom: isStickyBottom,
        distanceFromTop: distanceFromTop
      });
    }
  };
}

function _isOffsetHeightDifferent(a: React.RefObject<HTMLElement>, b: React.RefObject<HTMLDivElement>): boolean {
  return (a && b && a.current && b.current && a.current.offsetHeight !== b.current.offsetHeight) as boolean;
}

function _usePlaceHolderForSticky(experimentalLayoutsFlag: boolean, canSticky: boolean): boolean {
  /**
   * Placeholders are not used if experimentalLayoutsFlag is true.
   * The optimization ensures the offsetHeight & scrollWidth calculations are not done and moving
   * actual content to/from it's actual place in DOM from/to stickyContainer is not done every time component becomes sticky/non-sticky.
   * It is achieved by duplicating the actual content at it's actual place in DOM and in the stickyContainer.
   * This also makes it possible to skip the offsetHeight calculations for stickyContainers.
   */
  const usePlaceholder = !experimentalLayoutsFlag;
  return canSticky && usePlaceholder;
}

function _getNonStickyPlaceholderHeightAndWidth(
  sticky: {
    state: IStickyState;
    canStickyTop: boolean;
    canStickyBottom: boolean;
    nonStickyContent: HTMLDivElement | null;
  },
  experimentalLayoutsFlag: boolean
): React.CSSProperties {
  const { isStickyTop, isStickyBottom } = sticky.state;
  const { nonStickyContent } = sticky;
  const usePlaceholderForStickyTop = _usePlaceHolderForSticky(experimentalLayoutsFlag, sticky.canStickyTop);
  const usePlaceholderForStickyBottom = _usePlaceHolderForSticky(experimentalLayoutsFlag, sticky.canStickyBottom);
  if ((isStickyTop && usePlaceholderForStickyTop) || (isStickyBottom && usePlaceholderForStickyBottom)) {
    let height = 0,
      width = 0;
    // Why is placeHolder width needed?
    // ScrollablePane content--container is reponsible for providing scrollbars depending on content overflow.
    // If the overflow is caused by content of sticky component when it is in non-sticky state,
    // ScrollablePane content--conatiner will provide horizontal scrollbar.
    // If the component becomes sticky, i.e., when state.isStickyTop || state.isStickyBottom becomes true,
    // it's actual content is no more inside ScrollablePane content--container.
    // ScrollablePane content--conatiner will see no need for horizontal scrollbar. (Assuming no other content is causing overflow)
    // The complete content of sticky component will not be viewable.
    // It is necessary to provide a placeHolder of a certain width (height is already being set) in the content--container,
    // to get a horizontal scrollbar & be able to view the complete content of sticky component.
    if (nonStickyContent && nonStickyContent.firstElementChild) {
      height = nonStickyContent.offsetHeight;
      // What value should be substituted for placeHolder width?
      // Assumption:
      //    1. Content inside <Sticky> should always be wrapped in a single div.
      //        <Sticky><div id={'firstElementChild'}>{intended_content}</div><Sticky/>
      //    2. -ve padding, margin, etc. are not be used.
      //    3. scrollWidth of a parent is greater than or equal to max of scrollWidths of it's children and same holds for children.
      // placeHolder width should be computed in the best possible way to prevent overscroll/underscroll.
      width =
        nonStickyContent.firstElementChild.scrollWidth +
        ((nonStickyContent.firstElementChild as HTMLElement).offsetWidth - nonStickyContent.firstElementChild.clientWidth);
    }
    return {
      height: height,
      width: width
    };
  } else {
    return {};
  }
}

function _getStickyContentStyles(isSticky: boolean, props: IStickyProps, root: HTMLDivElement | null): React.CSSProperties {
  return {
    visibility: isSticky ? 'visible' : 'hidden',
    pointerEvents: isSticky ? 'auto' : 'none',
    overflow: 'hidden',
    backgroundColor: props.stickyBackgroundColor || _getBackground(root)
  };
}

// Gets background of nearest parent element that has a declared background-color attribute
function _getBackground(root: HTMLDivElement | null): string | undefined {
  if (!root) {
    return undefined;
  }

  let curr: HTMLElement = root;
  let backgroundColor = window.getComputedStyle(curr).getPropertyValue(BACKGROUNDCOLORSTRING);
  while (backgroundColor === 'rgba(0, 0, 0, 0)' || backgroundColor === 'transparent') {
    if (curr.tagName === 'HTML') {
      // Fallback color if no element has a declared background-color attribute
      return undefined;
    }
    if (curr.parentElement) {
      curr = curr.parentElement;
    }
    backgroundColor = window.getComputedStyle(curr).getPropertyValue(BACKGROUNDCOLORSTRING);
  }
  return backgroundColor;
}
const BACKGROUNDCOLORSTRING: string = 'background-color';

const _getNonStickyDistanceFromTop = (container: HTMLElement, root: HTMLDivElement | null): number => {
  let distance = 0;
  let currElem = root;

  if (currElem) {
    while (currElem && currElem.offsetParent !== container) {
      distance += currElem.offsetTop;
      currElem = currElem.offsetParent as HTMLDivElement;
    }

    if (currElem && currElem.offsetParent === container) {
      distance += currElem.offsetTop;
    }
  }
  return distance;
};

const _getStickyDistanceFromTop = (stickyContentTop: HTMLDivElement | null): number => {
  return stickyContentTop ? stickyContentTop.offsetTop : 0;
};

const _getStickyDistanceFromTopForFooter = (
  container: HTMLElement,
  footerStickyVisibleContainer: HTMLElement,
  stickyContentBottom: HTMLDivElement | null
): number => {
  return stickyContentBottom ? container.clientHeight - footerStickyVisibleContainer.offsetHeight + stickyContentBottom.offsetTop : 0;
};

function _getStickyPlaceholderHeight(isSticky: boolean, nonStickyContent: HTMLDivElement | null): React.CSSProperties {
  const height = nonStickyContent ? nonStickyContent.offsetHeight : 0;
  return {
    visibility: isSticky ? 'hidden' : 'visible',
    height: isSticky ? 0 : height
  };
}

function _getContentStyles(isSticky: boolean, root: HTMLDivElement | null, stickyBackgroundColor?: string): React.CSSProperties {
  return {
    backgroundColor: stickyBackgroundColor || _getBackground(root),
    overflow: isSticky ? 'hidden' : ''
  };
}
