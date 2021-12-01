/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import { ReloadedEvent } from "@itwin/mobile-sdk-core";
import { DraggableComponent, ResizableBottomPanel, ResizableBottomPanelProps } from "@itwin/mobile-ui-react";
import { HeaderTitle } from "./Exports";

import "./ListBottomPanel.scss";

/// Properties for the [[ListBottomPanel]] React component.
export interface ListBottomPanelProps extends ResizableBottomPanelProps {
  title: string;
  iconSpec: string;
  reloadedEvent?: ReloadedEvent;
  children?: React.ReactNode;
}

export enum ListSelectionMode {
  Toggle,
  SelectAll,
  SelectNone
}

/** [[ResizableBottomPanel]] React component that shows an arbitrary list of children.
 */
export function ListBottomPanel(props: ListBottomPanelProps) {
  const { title, iconSpec, reloadedEvent, children, ...otherProps } = props;

  return (
    <ResizableBottomPanel
      {...otherProps}
      className="list-bottom-panel"
      header={<DraggableComponent className="resizable-panel-header">
        <HeaderTitle label={title} iconSpec={iconSpec} />
      </DraggableComponent>}
      reloadedEvent={reloadedEvent}
    >
      <div className="list">
        <div className="list-items">
          {children}
        </div>
      </div>
    </ResizableBottomPanel>
  );
}
