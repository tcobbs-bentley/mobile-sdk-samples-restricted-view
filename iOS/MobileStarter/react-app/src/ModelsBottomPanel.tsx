/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import classnames from "classnames";
import { IModelConnection, PhysicalModelState, SpatialViewState } from "@bentley/imodeljs-frontend";
import { ModelProps } from "@bentley/imodeljs-common";
import { ReloadedEvent } from "@itwin/mobile-sdk-core";
import { IconImage, ResizableBottomPanelProps, useFirstViewport, useForceUpdate } from "@itwin/mobile-ui-react";
import { ListBottomPanel, ListSelectionMode, i18n } from "./Exports";

/// Properties for the [[ModelsBottomPanel]] React component.
export interface ModelsBottomPanelProps extends ResizableBottomPanelProps {
  /// The loaded iModel from which to pick models.
  iModel: IModelConnection;
}

/** [[ResizableBottomPanel]] React component that allows the user to select a specific physical model to display, or all.
 */
export function ModelsBottomPanel(props: ModelsBottomPanelProps) {
  const { iModel, ...otherProps } = props;
  const title = React.useMemo(() => i18n("ModelScreen", "Models"), []);
  const allLabel = React.useMemo(() => i18n("Shared", "All"), []);
  const noneLabel = React.useMemo(() => i18n("Shared", "None"), []);
  const reloadedEvent = React.useRef(new ReloadedEvent());
  const [physicalModels, setPhysicalModels] = React.useState<ModelProps[]>([]);
  const vp = useFirstViewport();
  const forceUpdate = useForceUpdate();

  // React effect run during component initialization.
  React.useEffect(() => {
    const models: ModelProps[] = [];
    // This function asynchronously loads all the physical models in the current iModel.
    const loadModels = async () => {
      setPhysicalModels([]);
      // Build our array of physical models.
      for await (const modelProps of iModel.models.query({ wantPrivate: false, from: PhysicalModelState.classFullName })) {
        const id = modelProps.id;
        if (id) {
          models.push(modelProps);
        }
      }
      models.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", undefined, { sensitivity: "base" }));
      setPhysicalModels(models);
      reloadedEvent.current.emit();
    };

    loadModels();
  }, [iModel.models]);

  const handleModelSelected = React.useCallback(async (modelProps?: ModelProps, selectionMode = ListSelectionMode.Toggle) => {
    if (!vp || !(vp.view instanceof SpatialViewState)) return;
    const modelSelector = vp.view.modelSelector;
    const allModelIds = physicalModels.map((value) => value.id!);
    switch (selectionMode) {
      case ListSelectionMode.Toggle:
        if (!modelProps || !modelProps.id) return; // This should never happen, but just in case.
        if (modelSelector.has(modelProps.id)) {
          modelSelector.dropModels(modelProps.id);
        } else {
          modelSelector.addModels(modelProps.id);
        }
        break;
      case ListSelectionMode.SelectAll:
        modelSelector.addModels(allModelIds);
        break;
      case ListSelectionMode.SelectNone:
        modelSelector.dropModels(allModelIds);
        break;
    }
    await modelSelector.load();
    // The changes above don't trigger a React render, but each model item in the list reflects the
    // visibility status of that model inside vp.view.modelSelector. So force an update.
    // We could maintain the visibility status in a React state variable, but doing so would just be extra work.
    forceUpdate();
  }, [physicalModels, vp, forceUpdate]);

  const isVisible = React.useCallback((modelProps: ModelProps) => {
    if (!(vp?.view instanceof SpatialViewState) || !modelProps.id) return false;
    return vp?.view.modelSelector.has(modelProps.id) ?? false;
  }, [vp]);

  const items = physicalModels.map((modelProps, index) => {
    const selected = isVisible(modelProps);
    return (
      <div
        className={classnames("list-item", selected && "selected")}
        key={index}
        onClick={() => handleModelSelected(modelProps)}
      >
        <IconImage iconSpec={selected ? "icon-visibility" : "icon-visibility-hide-2"} margin="0px 8px 0px 0px" />
        {modelProps.name}
      </div>
    );
  });
  items.unshift((
    <div className="list-item bold" key="none" onClick={() => handleModelSelected(undefined, ListSelectionMode.SelectNone)}>{noneLabel}</div>
  ));
  items.unshift((
    <div className="list-item bold" key="all" onClick={() => handleModelSelected(undefined, ListSelectionMode.SelectAll)}>{allLabel}</div>
  ));
  return (
    <ListBottomPanel
      {...otherProps}
      title={title}
      iconSpec="icon-model"
      reloadedEvent={reloadedEvent.current}
      children={items}
    />
  );
}
