/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import classnames from "classnames";
import { IModelConnection, SpatialViewState } from "@bentley/imodeljs-frontend";
import { ReloadedEvent } from "@itwin/mobile-sdk-core";
import { IconImage, ResizableBottomPanelProps, useFirstViewport, useForceUpdate } from "@itwin/mobile-ui-react";
import { ListBottomPanel, ListSelectionMode, i18n } from "./Exports";
import { Id64, Id64String } from "@bentley/bentleyjs-core";

/// Properties for the [[CategoriesBottomPanel]] React component.
export interface CategoriesBottomPanelProps extends ResizableBottomPanelProps {
  /// The loaded iModel from which to pick categories.
  iModel: IModelConnection;
}

/// Interface representing the fields in the Category that we care about.
interface CategoryInfo {
  id: Id64String;
  name: string;
}

/// Fetch all category IDs that are attached to 3D geometry.
async function fetch3dCategoryIds(iModel: IModelConnection) {
  return fetchCategoryIds(iModel, "GeometricElement3d");
}

/// Fetch all cateogry IDs from the specified table.
async function fetchCategoryIds(iModel: IModelConnection, table: string) {
  const rows = await fetchRows(iModel, "SELECT DISTINCT Category.Id FROM bis." + table);
  const categoryIds = rows.map((value) => Id64.fromString(value["category.id"]));
  return categoryIds;
}

/// Fetch all categories.
async function fetchCategories(iModel: IModelConnection) {
  const rows = await fetchRows(iModel, "SELECT ECInstanceId, CodeValue FROM bis.Category");
  const categories = rows.map((value) => { return { ...value, id: Id64.fromString(value.id) }; });
  return categories;
}

/// Fetch rows from the iModel using the specified ecsql.
async function fetchRows(iModel: IModelConnection, ecsql: string) {
  const rows: any[] = [];
  if (!iModel) return rows;
  for await (const row of iModel.query(ecsql)) {
    rows.push(row);
  }
  return rows;
}

/** [[ResizableBottomPanel]] React component that allows the user to select a specific category to display, or all.
 */
export function CategoriesBottomPanel(props: CategoriesBottomPanelProps) {
  const { iModel, ...otherProps } = props;
  const title = React.useMemo(() => i18n("ModelScreen", "Categories"), []);
  const allLabel = React.useMemo(() => i18n("Shared", "All"), []);
  const noneLabel = React.useMemo(() => i18n("Shared", "None"), []);
  const reloadedEvent = React.useRef(new ReloadedEvent());
  const [categories, setCategories] = React.useState<CategoryInfo[]>([]);
  const vp = useFirstViewport();
  const forceUpdate = useForceUpdate();

  // React effect run during component initialization.
  React.useEffect(() => {
    // This function asynchronously loads all the categories used by 3D geometry in the current iModel.
    const loadCategories = async () => {
      setCategories([]);
      const categoryIdRows = await fetch3dCategoryIds(iModel);
      const categoryRows = await fetchCategories(iModel);
      // We only want to display the categories that are attached to 3D geometry, so put those IDs in a
      // Set for fast lookup.
      const categoryIds = new Set<string>();
      for (const categoryId of categoryIdRows) {
        if (categoryId) {
          categoryIds.add(categoryId);
        }
      }
      const localCategories: CategoryInfo[] = [];
      // Build our array of categories attached to 3D geometry.
      for (const category of categoryRows) {
        if (categoryIds.has(category.id) && category.codeValue) {
          localCategories.push({ id: category.id, name: category.codeValue });
        }
      }
      localCategories.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
      setCategories(localCategories);
      reloadedEvent.current.emit();
    };

    loadCategories();
  }, [iModel, iModel.models]);

  const handleSelection = React.useCallback((category?: CategoryInfo, selectionMode = ListSelectionMode.Toggle) => {
    if (!vp || !(vp.view instanceof SpatialViewState)) return;
    const categorySelector = vp.view.categorySelector;
    const allCategoryIds = categories.map((value) => value.id);
    switch (selectionMode) {
      case ListSelectionMode.Toggle:
        if (!category) return; // This should never happen, but just in case.
        if (categorySelector.has(category.id)) {
          categorySelector.dropCategories(category.id);
        } else {
          categorySelector.addCategories(category.id);
        }
        break;
      case ListSelectionMode.SelectAll:
        categorySelector.addCategories(allCategoryIds);
        break;
      case ListSelectionMode.SelectNone:
        categorySelector.dropCategories(allCategoryIds);
        break;
    }
    // The changes above don't trigger a React render, but each category item in the list reflects the
    // visibility status of that category inside vp.view.modelSelector. So force an update.
    // We could maintain the visibility status in a React state variable, but doing so would just be extra work.
    forceUpdate();
  }, [categories, vp, forceUpdate]);

  const isVisible = React.useCallback((category: CategoryInfo) => {
    return vp?.view.categorySelector.has(category.id) ?? false;
  }, [vp]);

  const items = categories.map((category, index) => {
    const selected = isVisible(category);
    return (
      <div
        className={classnames("list-item", selected && "selected")}
        key={index}
        onClick={() => handleSelection(category)}
      >
        <IconImage iconSpec={selected ? "icon-visibility" : "icon-visibility-hide-2"} margin="0px 8px 0px 0px" />
        {category.name}
      </div>
    );
  });
  items.unshift((
    <div className="list-item bold" key="none" onClick={() => handleSelection(undefined, ListSelectionMode.SelectNone)}>{noneLabel}</div>
  ));
  items.unshift((
    <div className="list-item bold" key="all" onClick={() => handleSelection(undefined, ListSelectionMode.SelectAll)}>{allLabel}</div>
  ));
  return (
    <ListBottomPanel
      {...otherProps}
      title={title}
      iconSpec="icon-layers"
      reloadedEvent={reloadedEvent.current}
      children={items}
    />
  );
}
