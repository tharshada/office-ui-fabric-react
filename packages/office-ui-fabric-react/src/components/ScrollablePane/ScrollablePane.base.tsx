import * as React from 'react';
import * as PropTypes from 'prop-types';
import { BaseComponent, classNamesFunction, divProperties, getNativeProps, getRTL } from '../../Utilities';
import { IScrollablePane, IScrollablePaneProps, IScrollablePaneStyles, IScrollablePaneStyleProps } from './ScrollablePane.types';
import { Sticky, StickyBehaviorType, StickyPositionType } from '../../Sticky';

export interface IScrollablePaneContext {
  scrollablePane?: {
    subscribe: (handler: (container: HTMLElement, stickyContainer: HTMLElement) => void) => void;
    unsubscribe: (handler: (container: HTMLElement, stickyContainer: HTMLElement) => void) => void;
    addSticky: (sticky: Sticky) => void;
    removeSticky: (sticky: Sticky) => void;
    updateStickyRefHeights: () => void;
    sortSticky: (sticky: Sticky, sortAgain?: boolean) => void;
    notifySubscribers: (sort?: boolean) => void;
    syncScrollSticky: (sticky: Sticky) => void;
    getScrollPosition: (horizontal?: boolean) => number;
    getUserInteractionStatus: () => boolean;
  };
}

export interface IScrollablePaneState {
  stickyTopHeight: number;
  stickyBottomHeight: number;
  scrollbarWidth: number;
  scrollbarHeight: number;
}

const getClassNames = classNamesFunction<IScrollablePaneStyleProps, IScrollablePaneStyles>();

export class ScrollablePaneBase extends BaseComponent<IScrollablePaneProps, IScrollablePaneState> implements IScrollablePane {
  public static childContextTypes: React.ValidationMap<IScrollablePaneContext> = {
    scrollablePane: PropTypes.object
  };

  private _stickiesAboveAlways: number;
  private _stickiesBelowAlways: number;
  private _scrollLeft: number;
  private _scrollTop: number;
  private _scrollbarHeight: number;
  private _scrollbarWidth: number;
  private _userInteractionStarted: boolean; // is true if user has started to interact by scrolling
  private _stickyAboveContainerHt: boolean;
  private _stickyBelowContainerHt: boolean;
  private _root = React.createRef<HTMLDivElement>();
  private _stickyAboveRef = React.createRef<HTMLDivElement>();
  private _stickyBelowRef = React.createRef<HTMLDivElement>();
  private _contentContainer = React.createRef<HTMLDivElement>();
  private _subscribers: Set<Function>;
  private _stickies: Set<Sticky>;
  private _mutationObserver: MutationObserver;
  private _notifyThrottled: () => void;

  constructor(props: IScrollablePaneProps) {
    super(props);
    this._subscribers = new Set<Function>();
    this._stickies = new Set<Sticky>();

    this.state = {
      stickyTopHeight: 0,
      stickyBottomHeight: 0,
      scrollbarWidth: 0,
      scrollbarHeight: 0
    };
    this._scrollbarHeight = this._scrollbarWidth = 0;
    this._stickiesAboveAlways = this._stickiesBelowAlways = 0;
    this._scrollLeft = this._scrollTop = 0;
    this._userInteractionStarted = false;
    this._stickyAboveContainerHt = this._stickyBelowContainerHt = true;
    this._notifyThrottled = this._async.throttle(this.notifySubscribers, 50);
  }

  public get root(): HTMLDivElement | null {
    return this._root.current;
  }

  public get stickyAbove(): HTMLDivElement | null {
    return this._stickyAboveRef.current;
  }

  public get stickyBelow(): HTMLDivElement | null {
    return this._stickyBelowRef.current;
  }

  public get contentContainer(): HTMLDivElement | null {
    return this._contentContainer.current;
  }

  public getChildContext(): IScrollablePaneContext {
    return {
      scrollablePane: {
        subscribe: this.subscribe,
        unsubscribe: this.unsubscribe,
        addSticky: this.addSticky,
        removeSticky: this.removeSticky,
        updateStickyRefHeights: this.updateStickyRefHeights,
        sortSticky: this.sortSticky,
        notifySubscribers: this.notifySubscribers,
        syncScrollSticky: this.syncScrollSticky,
        getScrollPosition: this.getScrollPosition,
        getUserInteractionStatus: this.getUserInteractionStatus
      }
    };
  }

  public componentDidMount() {
    const { initialScrollPosition } = this.props;
    this._events.on(this.contentContainer, 'scroll', this._onScroll);
    this._events.on(window, 'resize', this._onWindowResize);
    if (this.contentContainer && initialScrollPosition) {
      this.contentContainer.scrollTop = initialScrollPosition;
    }

    // Set sticky distances from top property, then sort in correct order and notify subscribers
    this.notifySubscribers();

    if ('MutationObserver' in window) {
      this._mutationObserver = new MutationObserver(mutation => {
        // Function to check if mutation is occuring in stickyAbove or stickyBelow
        function checkIfMutationIsSticky(mutationRecord: MutationRecord): boolean {
          if (this.stickyAbove !== null && this.stickyBelow !== null) {
            return this.stickyAbove.contains(mutationRecord.target) || this.stickyBelow.contains(mutationRecord.target);
          }
          return false;
        }

        // Compute the scrollbar height which might have changed due to change in width of the content which might cause overflow
        const scrollbarHeight = this.state.scrollbarHeight || this._getScrollbarHeight();
        const scrollbarWidth = this.state.scrollbarWidth || this._getScrollbarWidth();
        // check if the scroll bar height has changed and update the state so that it's postioned correctly below sticky footer
        if (scrollbarHeight !== this.state.scrollbarHeight || scrollbarWidth !== this.state.scrollbarWidth) {
          this.setState({
            scrollbarHeight: scrollbarHeight,
            scrollbarWidth: scrollbarWidth
          });
        }

        // Notify subscribers again to re-check whether Sticky should be Sticky'd or not
        this.notifySubscribers();

        // If mutation occurs in sticky header or footer, then update sticky top/bottom heights
        if (mutation.some(checkIfMutationIsSticky.bind(this))) {
          this.updateStickyRefHeights();
        } else {
          // If mutation occurs in scrollable region, then find Sticky it belongs to and force update
          const stickyList: Sticky[] = [];
          this._stickies.forEach(sticky => {
            if (sticky.root && sticky.root.contains(mutation[0].target)) {
              stickyList.push(sticky);
            }
          });
          if (stickyList.length) {
            stickyList.forEach(sticky => {
              sticky.forceUpdate();
            });
          }
        }
      });

      if (this.root) {
        this._mutationObserver.observe(this.root, {
          childList: true,
          attributes: true,
          subtree: true,
          characterData: true
        });
      }
    }
  }

  public componentWillUnmount() {
    this._events.off(this.contentContainer);
    this._events.off(window);

    if (this._mutationObserver) {
      this._mutationObserver.disconnect();
    }
  }

  // Only updates if props/state change, just to prevent excessive setState with updateStickyRefHeights
  public shouldComponentUpdate(nextProps: IScrollablePaneProps, nextState: IScrollablePaneState): boolean {
    return (
      this.props.children !== nextProps.children ||
      this.props.initialScrollPosition !== nextProps.initialScrollPosition ||
      this.props.className !== nextProps.className ||
      this.state.stickyTopHeight !== nextState.stickyTopHeight ||
      this.state.stickyBottomHeight !== nextState.stickyBottomHeight ||
      this.state.scrollbarWidth !== nextState.scrollbarWidth ||
      this.state.scrollbarHeight !== nextState.scrollbarHeight
    );
  }

  public componentDidUpdate(prevProps: IScrollablePaneProps, prevState: IScrollablePaneState) {
    const initialScrollPosition = this.props.initialScrollPosition;
    if (this.contentContainer && typeof initialScrollPosition === 'number' && prevProps.initialScrollPosition !== initialScrollPosition) {
      this.contentContainer.scrollTop = initialScrollPosition;
    }

    // Update subscribers when stickyTopHeight/stickyBottomHeight changes
    if (prevState.stickyTopHeight !== this.state.stickyTopHeight || prevState.stickyBottomHeight !== this.state.stickyBottomHeight) {
      this.notifySubscribers();
    }

    // this._async.setTimeout(this._onWindowResize, 0);
  }

  public render(): JSX.Element {
    const { className, theme, styles } = this.props;
    const { stickyTopHeight, stickyBottomHeight } = this.state;
    const classNames = getClassNames(styles!, {
      theme: theme!,
      className,
      scrollbarVisibility: this.props.scrollbarVisibility
    });

    return (
      <div {...getNativeProps(this.props, divProperties)} ref={this._root} className={classNames.root}>
        <div ref={this._contentContainer} className={classNames.contentContainer} data-is-scrollable={true}>
          {this.props.children}
        </div>
        <div ref={this._stickyAboveRef} className={classNames.stickyAbove} style={this._getStickyContainerStyle(stickyTopHeight, true)} />
        <div className={classNames.stickyBelow} style={this._getStickyContainerStyle(stickyBottomHeight, false)}>
          <div ref={this._stickyBelowRef} className={classNames.stickyBelowItems} />
        </div>
      </div>
    );
  }

  public setStickiesDistanceFromTop(): void {
    if (this.contentContainer) {
      this._stickies.forEach(sticky => {
        sticky.setDistanceFromTop(this.contentContainer as HTMLDivElement);
      });
    }
  }

  public forceLayoutUpdate() {
    this._onWindowResize();
  }

  public subscribe = (handler: Function): void => {
    this._subscribers.add(handler);
  };

  public unsubscribe = (handler: Function): void => {
    this._subscribers.delete(handler);
  };

  public addSticky = (sticky: Sticky): void => {
    // this method is called once per sticky lifecycle
    const { stickyBehavior, stickyPosition, placeHolder } = sticky.props;
    if (placeHolder && sticky.canStickyTop) {
      this._stickyAboveContainerHt = false;
    } else if (placeHolder && sticky.canStickyBottom) {
      this._stickyBelowContainerHt = false;
    }
    let isStickyTopAlways: boolean = false;
    let isStickyBottomAlways: boolean = false;
    // stickyAlways doesn't apply to StickyPosition.Both
    if (stickyBehavior && stickyBehavior.type === StickyBehaviorType.StickyAlways) {
      isStickyTopAlways = stickyPosition === StickyPositionType.Header;
      isStickyBottomAlways = stickyPosition === StickyPositionType.Footer;
    }

    if (isStickyTopAlways) {
      this._stickiesAboveAlways++;
    }
    if (isStickyBottomAlways) {
      this._stickiesBelowAlways++;
    }
    // Adding sticky to _stickies is required to
    // (1) sync scrollLeft for horizontal scroll
    this._stickies.add(sticky);
    // If ScrollablePane is mounted, then sort sticky in correct place
    if (this.contentContainer) {
      if (stickyBehavior && stickyBehavior.type === StickyBehaviorType.StickyAlways) {
        sticky.setState({
          distanceFromTop: 0, // must set distanceFromTop to sort/add it to stickyContent Ref to stickyContainer.
          isStickyBottom: isStickyBottomAlways,
          // initial values of isStickyTop & isStickyBottom are false, set from constructor
          // must set isStickyTop or isStickyBottom to place nonStickyContent as a child of stickyContent Ref.
          isStickyTop: isStickyTopAlways
        });
      } else if (stickyBehavior && stickyBehavior.type === StickyBehaviorType.StickyOnScroll) {
        // scrollablePane has mounted
        this.sortSticky(sticky);
      } else {
        sticky.setDistanceFromTop(this.contentContainer);
        this.sortSticky(sticky);
      }
    }
    // else scrollablePane is yet to be mounted,
    // when scrollablePane is mounted, it calls notifySubscriber which
    // 1. set distanceFromTop to sort/add it to stickyContent Ref to stickyContainer.
    // 2. set isStickyTop or isStickyBottom to place nonStickyContent as a child of stickyContent Ref.
  };

  public removeSticky = (sticky: Sticky): void => {
    this._stickies.delete(sticky);
    const { stickyBehavior, stickyPosition } = sticky.props;
    let isStickyTopAlways: boolean = false;
    let isStickyBottomAlways: boolean = false;
    // stickyAlways doesn't apply to StickyPosition.Both
    if (stickyBehavior && stickyBehavior.type === StickyBehaviorType.StickyAlways) {
      isStickyTopAlways = stickyPosition === StickyPositionType.Header;
      isStickyBottomAlways = stickyPosition === StickyPositionType.Footer;
    }
    if (isStickyTopAlways) {
      this._stickiesAboveAlways--;
    }
    if (isStickyBottomAlways) {
      this._stickiesBelowAlways--;
    }
    this._removeStickyFromContainers(sticky);
    this.notifySubscribers();
  };

  public sortSticky = (sticky: Sticky, sortAgain?: boolean): void => {
    if (this.stickyAbove && this.stickyBelow) {
      if (sortAgain) {
        this._removeStickyFromContainers(sticky);
      }
      if (sticky.canStickyTop && sticky.stickyContentTop) {
        this._addToStickyContainer(sticky, this.stickyAbove, sticky.stickyContentTop);
      }

      if (sticky.canStickyBottom && sticky.stickyContentBottom) {
        this._addToStickyContainer(sticky, this.stickyBelow, sticky.stickyContentBottom);
      }
    }
  };

  public updateStickyRefHeights = (): void => {
    const stickyItems = this._stickies;

    let stickyTopHeight = 0;
    let stickyBottomHeight = 0;

    stickyItems.forEach((sticky: Sticky) => {
      const { isStickyTop, isStickyBottom } = sticky.state;
      if (sticky.nonStickyContent) {
        if (isStickyTop && !this._stickiesAboveAlways && this._stickyAboveContainerHt) {
          stickyTopHeight += sticky.nonStickyContent.offsetHeight;
        }
        if (isStickyBottom && !this._stickiesBelowAlways && !this._stickyBelowContainerHt) {
          stickyBottomHeight += sticky.nonStickyContent.offsetHeight;
        }
        if ((this._stickyAboveContainerHt && sticky.canStickyTop) || (this._stickyBelowContainerHt && sticky.canStickyBottom)) {
          this._checkStickyStatus(sticky);
        }
      }
    });

    this.setState({
      stickyTopHeight: stickyTopHeight,
      stickyBottomHeight: stickyBottomHeight
    });
  };

  public notifySubscribers = (): void => {
    if (this.contentContainer) {
      this._subscribers.forEach(handle => {
        // this.stickyBelow is passed in for calculating distance to determine Sticky status
        handle(this.contentContainer, this.stickyBelow);
      });
    }
  };

  public getScrollPosition = (horizontal?: boolean): number => {
    if (this.contentContainer) {
      return horizontal ? this._scrollLeft : this._scrollTop;
    }

    return 0;
  };

  public syncScrollSticky = (sticky: Sticky): void => {
    if (sticky && this.contentContainer) {
      sticky.syncScroll(this.contentContainer);
    }
  };

  public getUserInteractionStatus = (): boolean => {
    return this._userInteractionStarted;
  };

  private _checkStickyStatus(sticky: Sticky): void {
    if (this.stickyAbove && this.stickyBelow && this.contentContainer && sticky.nonStickyContent) {
      // If sticky is sticky, then append content to appropriate container
      if (sticky.state.isStickyTop || sticky.state.isStickyBottom) {
        if (
          this._stickyAboveContainerHt &&
          sticky.state.isStickyTop &&
          !this.stickyAbove.contains(sticky.nonStickyContent) &&
          sticky.stickyContentTop
        ) {
          sticky.addSticky(sticky.stickyContentTop);
        }

        if (
          this._stickyBelowContainerHt &&
          sticky.state.isStickyBottom &&
          !this.stickyBelow.contains(sticky.nonStickyContent) &&
          sticky.stickyContentBottom
        ) {
          sticky.addSticky(sticky.stickyContentBottom);
        }
      } else if (
        ((this._stickyAboveContainerHt && sticky.canStickyTop) || (this._stickyBelowContainerHt && sticky.canStickyBottom)) &&
        !this.contentContainer.contains(sticky.nonStickyContent)
      ) {
        // Reset sticky if it's not sticky and not in the contentContainer element
        sticky.resetSticky();
      }
    }
  }

  private _sortStickyList(stickyList: Sticky[], sortBasedOnOrder: boolean): Sticky[] {
    if (sortBasedOnOrder) {
      return stickyList.sort((a, b) => {
        return a.props.stickyBehavior!.order - b.props.stickyBehavior!.order;
      });
    } else {
      return stickyList.sort((a, b) => {
        return (a.state.distanceFromTop || 0) - (b.state.distanceFromTop || 0);
      });
    }
  }

  private _isTargetContainer(a: Sticky, b: Sticky, sortBasedOnOrder: boolean): boolean {
    if (sortBasedOnOrder) {
      return a.props.stickyBehavior!.order >= b.props.stickyBehavior!.order;
    } else {
      return (a.state.distanceFromTop || 0) >= (b.state.distanceFromTop || 0);
    }
  }

  private _addToStickyContainer = (sticky: Sticky, stickyContainer: HTMLDivElement, stickyContentToAdd: HTMLDivElement): void => {
    // If there's no children, append child to list, otherwise, sort though array and append at correct position
    if (!stickyContainer.children.length) {
      stickyContainer.appendChild(stickyContentToAdd);
    } else {
      // If stickyContentToAdd isn't a child element of target container, then append
      if (!stickyContainer.contains(stickyContentToAdd)) {
        const stickyChildrenElements: Element[] = [].slice.call(stickyContainer.children);

        const stickyList: Sticky[] = [];
        // Get stickies.  Filter by canStickyTop/Bottom, then sort by distance from top, and then
        // filter by elements that are in the stickyContainer already.
        this._stickies.forEach(stickyItem => {
          if (stickyContainer === this.stickyAbove && sticky.canStickyTop) {
            stickyList.push(stickyItem);
          } else if (sticky.canStickyBottom) {
            stickyList.push(stickyItem);
          }
        });
        // a sticky container must has all stickies of same stickyBehavior.type
        // sorting based on order is used for stickyAlways.
        const sortBasedOnOrder: boolean =
          (stickyContainer === this.stickyAbove
            ? !!this._stickiesAboveAlways
            : !!(stickyContainer === this.stickyBelow && this._stickiesBelowAlways)) ||
          !!(
            sticky.props.stickyBehavior &&
            sticky.props.stickyBehavior.type === StickyBehaviorType.StickyOnScroll &&
            !this.getUserInteractionStatus()
          );

        const stickyListSorted = this._sortStickyList(stickyList, sortBasedOnOrder).filter(item => {
          const stickyContent = stickyContainer === this.stickyAbove ? item.stickyContentTop : item.stickyContentBottom;
          if (stickyContent) {
            return stickyChildrenElements.indexOf(stickyContent) > -1;
          }
        });

        // Get first element that has a distance from top that is further than our sticky that is being added
        let targetStickyToAppendBefore: Sticky | undefined = undefined;
        for (const i in stickyListSorted) {
          if (this._isTargetContainer(stickyListSorted[i], sticky, sortBasedOnOrder)) {
            targetStickyToAppendBefore = stickyListSorted[i];
            break;
          }
        }

        // If target element to append before is known, then grab respective stickyContentTop/Bottom element and insert before
        let targetContainer: HTMLDivElement | null = null;
        if (targetStickyToAppendBefore) {
          targetContainer =
            stickyContainer === this.stickyAbove
              ? targetStickyToAppendBefore.stickyContentTop
              : targetStickyToAppendBefore.stickyContentBottom;
        }
        stickyContainer.insertBefore(stickyContentToAdd, targetContainer);
      }
    }
  };

  private _removeStickyFromContainers = (sticky: Sticky): void => {
    if (this.stickyAbove && sticky.stickyContentTop && this.stickyAbove.contains(sticky.stickyContentTop)) {
      this.stickyAbove.removeChild(sticky.stickyContentTop);
    }
    if (this.stickyBelow && sticky.stickyContentBottom && this.stickyBelow.contains(sticky.stickyContentBottom)) {
      this.stickyBelow.removeChild(sticky.stickyContentBottom);
    }
  };

  private _onWindowResize = (): void => {
    const scrollbarWidth = (this._scrollbarWidth = this._getScrollbarWidth());
    const scrollbarHeight = (this._scrollbarHeight = this._getScrollbarHeight());
    if (this.contentContainer) {
      this._scrollLeft = this.contentContainer.scrollLeft;
      this._scrollTop = this.contentContainer.scrollTop;
    }
    this.setState({
      scrollbarWidth,
      scrollbarHeight
    });

    this.notifySubscribers();
  };

  private _getStickyContainerStyle = (height: number, isTop: boolean): React.CSSProperties => {
    const containerHeight = isTop
      ? this._stickiesAboveAlways || !this._stickyAboveContainerHt
        ? undefined
        : height
      : this._stickiesBelowAlways || !this._stickyBelowContainerHt
      ? undefined
      : height;
    this._scrollbarWidth = this._scrollbarWidth || this._getScrollbarWidth();
    this._scrollbarHeight = this._scrollbarHeight || this._getScrollbarHeight();

    return {
      ...(containerHeight !== undefined ? { height: height } : {}),
      ...(getRTL()
        ? {
            right: '0',
            left: `${this.state.scrollbarWidth || this._scrollbarWidth || 0}px`
          }
        : {
            left: '0',
            right: `${this.state.scrollbarWidth || this._scrollbarWidth || 0}px`
          }),
      ...(isTop
        ? {
            top: '0'
          }
        : {
            bottom: `${this.state.scrollbarHeight || this._scrollbarHeight || 0}px`
          })
    };
  };

  private _getScrollbarWidth(): number {
    const { contentContainer } = this;
    return contentContainer ? contentContainer.offsetWidth - contentContainer.clientWidth : 0;
  }

  private _getScrollbarHeight(): number {
    const { contentContainer } = this;
    return contentContainer ? contentContainer.offsetHeight - contentContainer.clientHeight : 0;
  }

  private _onScroll = () => {
    const { contentContainer } = this;
    if (contentContainer) {
      if (this._scrollLeft !== contentContainer.scrollLeft) {
        this._scrollLeft = contentContainer.scrollLeft;
        this._stickies.forEach((sticky: Sticky) => {
          const { isStickyBottom, isStickyTop } = sticky.state;
          if (isStickyBottom || isStickyTop) {
            sticky.syncScroll(contentContainer);
          }
        });
      }
      if (this._scrollTop !== contentContainer.scrollTop) {
        this._userInteractionStarted = true;
        this._scrollTop = contentContainer.scrollTop;
        this._notifyThrottled();
      }
    }
  };
}
