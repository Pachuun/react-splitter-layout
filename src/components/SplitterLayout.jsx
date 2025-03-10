import React from 'react';
import PropTypes from 'prop-types';
import Pane from './Pane';
import { IconButton, Popover, Tooltip } from '@material-ui/core'
import ArrowDropUpIcon from '@material-ui/icons/ArrowDropUp';
import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';


import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';

function clearSelection() {
  if (document.body.createTextRange) {
    // https://github.com/zesik/react-splitter-layout/issues/16
    // https://stackoverflow.com/questions/22914075/#37580789
    const range = document.body.createTextRange();
    range.collapse();
    range.select();
  } else if (window.getSelection) {
    if (window.getSelection().empty) {
      window.getSelection().empty();
    } else if (window.getSelection().removeAllRanges) {
      window.getSelection().removeAllRanges();
    }
  } else if (document.selection) {
    document.selection.empty();
  }
}

const DEFAULT_SPLITTER_SIZE = 4;

class SplitterLayout extends React.Component {
  constructor(props) {
    super(props);
    this.handleResize = this.handleResize.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleSplitterMouseDown = this.handleSplitterMouseDown.bind(this);
    this.handleUpButtonClick = this.handleUpButtonClick.bind(this);
    this.handleDownButtonClick = this.handleDownButtonClick.bind(this);

    this.handleFullUpButtonClick = this.handleFullUpButtonClick.bind(this);
    this.handleFullDownButtonClick = this.handleFullDownButtonClick.bind(this);

    this.handleSplitterMouseEnter = this.handleSplitterMouseEnter.bind(this);
    this.handleSplitterMouseLeave = this.handleSplitterMouseLeave.bind(this);
    this.handleTooltipMouseEnter = this.handleTooltipMouseEnter.bind(this);
    this.handleTooltipMouseLeave = this.handleTooltipMouseLeave.bind(this);
    this.state = {
      secondaryPaneSize: 0,
      resizing: false,
      tooltipOpen: false,
      xpos: 0,    
    };

    this.noHide = false;
    this.timeoutId = null;
  }

  componentDidMount() {
    window.addEventListener('resize', this.handleResize);
    document.addEventListener('mouseup', this.handleMouseUp);
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('touchend', this.handleMouseUp);
    document.addEventListener('touchmove', this.handleTouchMove);

    let secondaryPaneSize;
    if (typeof this.props.secondaryInitialSize !== 'undefined') {
      secondaryPaneSize = this.props.secondaryInitialSize;
    } else {
      const containerRect = this.container.getBoundingClientRect();
      let splitterRect;
      if (this.splitter) {
        splitterRect = this.splitter.getBoundingClientRect();
      } else {
        // Simulate a splitter
        splitterRect = { width: DEFAULT_SPLITTER_SIZE, height: DEFAULT_SPLITTER_SIZE };
      }
      secondaryPaneSize = this.getSecondaryPaneSize(containerRect, splitterRect, {
        left: containerRect.left + ((containerRect.width - splitterRect.width) / 2),
        top: containerRect.top + ((containerRect.height - splitterRect.height) / 2)
      }, false);
    }
    this.setState({ secondaryPaneSize });
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.secondaryPaneSize !== this.state.secondaryPaneSize && this.props.onSecondaryPaneSizeChange) {
      this.props.onSecondaryPaneSizeChange(this.state.secondaryPaneSize);
    }
    if (prevState.resizing !== this.state.resizing) {
      if (this.state.resizing) {
        if (this.props.onDragStart) {
          this.props.onDragStart();
        }
      } else if (this.props.onDragEnd) {
        this.props.onDragEnd();
      }
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('touchend', this.handleMouseUp);
    document.removeEventListener('touchmove', this.handleTouchMove);
  }

  getSecondaryPaneSize(containerRect, splitterRect, clientPosition, offsetMouse) {
    let totalSize;
    let splitterSize;
    let offset;
    if (this.props.vertical) {
      totalSize = containerRect.height;
      splitterSize = splitterRect.height;
      offset = clientPosition.top - containerRect.top;
    } else {
      totalSize = containerRect.width;
      splitterSize = splitterRect.width;
      offset = clientPosition.left - containerRect.left;
    }
    if (offsetMouse) {
      offset -= splitterSize / 2;
    }
    if (offset < 0) {
      offset = 0;
    } else if (offset > totalSize - splitterSize) {
      offset = totalSize - splitterSize;
    }

    let secondaryPaneSize;
    if (this.props.primaryIndex === 1) {
      secondaryPaneSize = offset;
    } else {
      secondaryPaneSize = totalSize - splitterSize - offset;
    }
    let primaryPaneSize = totalSize - splitterSize - secondaryPaneSize;
    if (this.props.percentage) {
      secondaryPaneSize = (secondaryPaneSize * 100) / totalSize;
      primaryPaneSize = (primaryPaneSize * 100) / totalSize;
      splitterSize = (splitterSize * 100) / totalSize;
      totalSize = 100;
    }

    if (primaryPaneSize < this.props.primaryMinSize) {
      secondaryPaneSize = Math.max(secondaryPaneSize - (this.props.primaryMinSize - primaryPaneSize), 0);
    } else if (secondaryPaneSize < this.props.secondaryMinSize) {
      secondaryPaneSize = Math.min(totalSize - splitterSize - this.props.primaryMinSize, this.props.secondaryMinSize);
    }

    return secondaryPaneSize;
  }

  handleResize() {
    if (this.splitter && !this.props.percentage) {
      const containerRect = this.container.getBoundingClientRect();
      const splitterRect = this.splitter.getBoundingClientRect();
      const secondaryPaneSize = this.getSecondaryPaneSize(containerRect, splitterRect, {
        left: splitterRect.left,
        top: splitterRect.top
      }, false);
      this.setState({ secondaryPaneSize });
    }
  }

  handleMouseMove(e) {
    if (this.state.resizing) {
      const containerRect = this.container.getBoundingClientRect();
      const splitterRect = this.splitter.getBoundingClientRect();
      const secondaryPaneSize = this.getSecondaryPaneSize(containerRect, splitterRect, {
        left: e.clientX,
        top: e.clientY
      }, true);
      clearSelection();
      this.setState({ secondaryPaneSize, tooltipOpen: false });
    }
  }

  handleTouchMove(e) {
    this.handleMouseMove(e.changedTouches[0]);
  }

  handleSplitterMouseDown() {
    clearSelection();
    this.setState({ resizing: true, tooltipOpen: false });
  }

  handleMouseUp() {
    this.noHide=true;
    this.setState(prevState => (prevState.resizing ? { resizing: false, tooltipOpen: true } : null));
  }

  handleSplitterMouseEnter(e) {

    let {tooltipOpen, resizing} = this.state;

    if (!resizing) {
      if (!tooltipOpen) {
        this.setState({
          tooltipOpen: true,
          xpos: e.pageX,
        })
        this.noHide=false;
      } else {
        this.noHide = true;
      }
    }
  }

  handleSplitterMouseLeave() {
    this.noHide=false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.timeoutId = setTimeout(() => {
      if (!this.noHide) {
        this.setState({
          tooltipOpen: false,
        })
      }
  }, 500)
  }

  handleTooltipMouseEnter() {
    this.noHide = true;
  }

  handleTooltipMouseLeave() {
    this.noHide = false;
    this.handleSplitterMouseLeave();
  }

  handleUpButtonClick() {
    let {secondaryPaneSize} = this.state;
    let rect = this.container.getBoundingClientRect();
    let increment = rect.height / 2
    let result = secondaryPaneSize + increment >= rect.height ? rect.height : secondaryPaneSize + increment;

    this.setState({
      secondaryPaneSize: result,
      tooltipOpen: false,
    })
  }

  handleDownButtonClick() {
    let {secondaryPaneSize} = this.state;
    let rect = this.container.getBoundingClientRect();
    let decrement = rect.height / 2
    let result = secondaryPaneSize - decrement > 0 ? secondaryPaneSize - decrement : 0;

    this.setState({
      secondaryPaneSize: result,
      tooltipOpen: false,
    })
  }

  handleFullUpButtonClick() {
    let rect = this.container.getBoundingClientRect();

    this.setState({
      secondaryPaneSize: rect.height,
      tooltipOpen: false,
    })
  }

  handleFullDownButtonClick() {
    this.setState({
      secondaryPaneSize: 0,
      tooltipOpen: false,
    })
  }

  render() {
    let containerClasses = 'splitter-layout';
    if (this.props.customClassName) {
      containerClasses += ` ${this.props.customClassName}`;
    }
    if (this.props.vertical) {
      containerClasses += ' splitter-layout-vertical';
    }
    if (this.state.resizing) {
      containerClasses += ' layout-changing';
    }

    let upButtonVisible = false;
    let downButtonVisible = false;
    let tooltipdY = 0;
    if (this.container && this.splitter) {
      let splitterRect = this.splitter.getBoundingClientRect();
      let rect = this.container.getBoundingClientRect();
      tooltipdY = rect.height + splitterRect.height - this.state.secondaryPaneSize
      upButtonVisible = this.state.secondaryPaneSize < rect.height - splitterRect.height
      downButtonVisible = this.state.secondaryPaneSize > 0
    }


    const children = React.Children.toArray(this.props.children).slice(0, 2);
    if (children.length === 0) {
      children.push(<div />);
    }
    const wrappedChildren = [];
    const primaryIndex = (this.props.primaryIndex !== 0 && this.props.primaryIndex !== 1) ? 0 : this.props.primaryIndex;
    for (let i = 0; i < children.length; ++i) {
      let primary = true;
      let size = null;
      if (children.length > 1 && i !== primaryIndex) {
        primary = false;
        size = this.state.secondaryPaneSize;
      }
      wrappedChildren.push(
        <Pane vertical={this.props.vertical} percentage={this.props.percentage} primary={primary} size={size} extraStyles={this.props.extraStyles[i]}>
          {children[i]}
        </Pane>
      );
    }

    let buttonStyle = {width:"20px", height:"20px", lineHeight: "20px"}

    return (
      <div className={containerClasses} ref={(c) => { this.container = c; }}>
        {wrappedChildren[0]}
        {wrappedChildren.length > 1 &&
          (
            <>
            <Popover open={this.state.tooltipOpen}
            anchorReference="anchorPosition"
            anchorPosition={{ top: tooltipdY, left: this.state.xpos - 90}}
            onMouseEnter={this.handleTooltipMouseEnter}
            onMouseLeave={this.handleTooltipMouseLeave}
            style={{
              pointerEvents: "none"
            }}
            PaperProps={{
              style:{
                pointerEvents: "all"
              }
            }}
            disableRestoreFocus
            
            >
              <div style={{margin: "5px"}}>
                <Tooltip title={"Опустить разделитель на всю высоту экрана"} style={{fontSize: '1em'}}>
                  <IconButton onClick={this.handleFullDownButtonClick} disabled={!downButtonVisible}  >
                    <ArrowDropDownIcon />
                  </IconButton >                 
                </Tooltip>
                <Tooltip title={"Опустить разделитель на половину высоты экрана"}>
                  <IconButton onClick={this.handleDownButtonClick} disabled={!downButtonVisible}   >
                    <KeyboardArrowDownIcon />
                  </IconButton > 
                </Tooltip>
                <Tooltip title={"Поднять разделитель на половину высоты экрана"}>
                  <IconButton onClick={this.handleUpButtonClick} disabled={!upButtonVisible} >
                    <KeyboardArrowUpIcon />
                  </IconButton >
                </Tooltip>
                <Tooltip title={"Поднять разделитель на всю высоту экрана"}>
                  <IconButton onClick={this.handleFullUpButtonClick} disabled={!upButtonVisible} >
                    <ArrowDropUpIcon />
                  </IconButton >
                </Tooltip>
                </div>
              </Popover>
              <div
                role="separator"
                className="layout-splitter"
                ref={(c) => { this.splitter = c; }}
                onMouseEnter={this.handleSplitterMouseEnter} 
                onMouseLeave={this.handleSplitterMouseLeave}
                onMouseDown={this.handleSplitterMouseDown}
                onTouchStart={this.handleSplitterMouseDown}
              >
              </div>

            </>
          )
        }
        {wrappedChildren.length > 1 && wrappedChildren[1]}
      </div>
    );
  }
}

SplitterLayout.propTypes = {
  customClassName: PropTypes.string,
  vertical: PropTypes.bool,
  percentage: PropTypes.bool,
  primaryIndex: PropTypes.number,
  primaryMinSize: PropTypes.number,
  secondaryInitialSize: PropTypes.number,
  secondaryMinSize: PropTypes.number,
  onDragStart: PropTypes.func,
  onDragEnd: PropTypes.func,
  onSecondaryPaneSizeChange: PropTypes.func,
  children: PropTypes.arrayOf(PropTypes.node),
  extraStyles: PropTypes.arrayOf(PropTypes.object),
};

SplitterLayout.defaultProps = {
  customClassName: '',
  vertical: false,
  percentage: false,
  primaryIndex: 0,
  primaryMinSize: 0,
  secondaryInitialSize: undefined,
  secondaryMinSize: 0,
  onDragStart: null,
  onDragEnd: null,
  onSecondaryPaneSizeChange: null,
  children: [],
  extraStyles: [],
};

export default SplitterLayout;
