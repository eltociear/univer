import {
    EVENT_TYPE,
    getColor,
    IScrollObserverParam,
    IWheelEvent,
    Rect,
    Scene,
    SceneViewer,
    ScrollBar,
    Spreadsheet,
    SpreadsheetColumnHeader,
    SpreadsheetRowHeader,
    SpreadsheetSkeleton,
    Viewport,
} from '@univerjs/base-render';
import {
    EventState,
    ICellData,
    IPageElement,
    LocaleService,
    ObjectMatrix,
    PageElementType,
    Styles,
} from '@univerjs/core';
import { Inject, Injector } from '@wendellhu/redi';

import { CanvasObjectProviderRegistry, ObjectAdaptor } from '../adaptor';

enum SHEET_VIEW_KEY {
    MAIN = 'spreadInSlide',
    SCENE = 'spreadInSlideScene',
    SCENE_VIEWER = 'spreadInSlideSceneViewer',
    ROW = 'spreadInSlideRow',
    COLUMN = 'spreadInSlideColumn',
    LEFT_TOP = 'spreadInSlideLeftTop',
    VIEW_MAIN = 'spreadInSlideViewMain',
    VIEW_TOP = 'spreadInSlideViewTop',
    VIEW_LEFT = 'spreadInSlideViewLeft',
    VIEW_LEFT_TOP = 'spreadInSlideViewLeftTop',
}

export class SpreadsheetAdaptor extends ObjectAdaptor {
    override zIndex = 4;

    override viewKey = PageElementType.SPREADSHEET;

    constructor(@Inject(LocaleService) private readonly _localeService: LocaleService) {
        super();
    }

    override check(type: PageElementType) {
        if (type !== this.viewKey) {
            return;
        }
        return this;
    }

    override convert(pageElement: IPageElement, mainScene: Scene) {
        const {
            id,
            zIndex,
            left = 0,
            top = 0,
            width,
            height,
            angle,
            scaleX,
            scaleY,
            skewX,
            skewY,
            flipX,
            flipY,
            title,
            description,
            spreadsheet: spreadsheetModel,
        } = pageElement;

        if (spreadsheetModel == null) {
            return;
        }

        const { worksheet, styles } = spreadsheetModel;

        const { columnData, rowData, cellData } = worksheet;

        const cellDataMatrix = new ObjectMatrix<ICellData>(cellData);

        const spreadsheetSkeleton = SpreadsheetSkeleton.create(
            undefined, // FIXME: worksheet in slide doesn't has a Worksheet object
            worksheet,
            cellDataMatrix,
            new Styles(styles),
            this._localeService
        );

        const { rowTotalHeight, columnTotalWidth, rowHeaderWidth, columnHeaderHeight } = spreadsheetSkeleton;

        const allWidth = columnTotalWidth + worksheet.rowHeader.width || 0;

        const allHeight = rowTotalHeight + worksheet.columnHeader.height || 0;

        const sv = new SceneViewer(SHEET_VIEW_KEY.SCENE_VIEWER + id, {
            top,
            left,
            width,
            height,
            zIndex,
            angle,
            scaleX,
            scaleY,
            skewX,
            skewY,
            flipX,
            flipY,
            isTransformer: true,
            forceRender: true,
        });
        const scene = new Scene(SHEET_VIEW_KEY.SCENE + id, sv, {
            width: allWidth,
            height: allHeight,
        });

        this._updateViewport(id, rowHeaderWidth, columnHeaderHeight, scene, mainScene);

        const spreadsheet = new Spreadsheet('testSheetViewer', spreadsheetSkeleton, false);
        const spreadsheetRowHeader = new SpreadsheetRowHeader(SHEET_VIEW_KEY.ROW, spreadsheetSkeleton);
        const spreadsheetColumnHeader = new SpreadsheetColumnHeader(SHEET_VIEW_KEY.COLUMN, spreadsheetSkeleton);
        const SpreadsheetLeftTopPlaceholder = new Rect(SHEET_VIEW_KEY.LEFT_TOP, {
            zIndex: 2,
            left: -1,
            top: -1,
            width: rowHeaderWidth,
            height: columnHeaderHeight,
            fill: getColor([248, 249, 250]),
            stroke: getColor([217, 217, 217]),
            strokeWidth: 1,
        });

        spreadsheet.zIndex = 10;
        scene.addObjects([spreadsheet], 1);
        scene.addObjects([spreadsheetRowHeader, spreadsheetColumnHeader, SpreadsheetLeftTopPlaceholder], 2);
        // spreadsheet.enableSelection();
        return sv;
    }

    // eslint-disable-next-line max-lines-per-function
    private _updateViewport(
        id: string,
        rowHeaderWidth: number,
        columnHeaderHeight: number,
        scene: Scene,
        mainScene: Scene
    ) {
        if (mainScene == null) {
            return;
        }
        const rowHeaderWidthScale = rowHeaderWidth * scene.scaleX;
        const columnHeaderHeightScale = columnHeaderHeight * scene.scaleY;

        const viewMain = new Viewport(SHEET_VIEW_KEY.VIEW_MAIN + id, scene, {
            left: rowHeaderWidthScale,
            top: columnHeaderHeightScale,
            bottom: 0,
            right: 0,
            isWheelPreventDefaultX: true,
        });
        const viewTop = new Viewport(SHEET_VIEW_KEY.VIEW_TOP + id, scene, {
            left: rowHeaderWidthScale,
            height: columnHeaderHeightScale,
            top: 0,
            right: 0,
            isWheelPreventDefaultX: true,
        });
        const viewLeft = new Viewport(SHEET_VIEW_KEY.VIEW_LEFT + id, scene, {
            left: 0,
            bottom: 0,
            top: columnHeaderHeightScale,
            width: rowHeaderWidthScale,
            isWheelPreventDefaultX: true,
        });
        const viewLeftTop = new Viewport(SHEET_VIEW_KEY.VIEW_LEFT_TOP + id, scene, {
            left: 0,
            top: 0,
            width: rowHeaderWidthScale,
            height: columnHeaderHeightScale,
            isWheelPreventDefaultX: true,
        });
        // viewMain.linkToViewport(viewLeft, LINK_VIEW_PORT_TYPE.Y);
        // viewMain.linkToViewport(viewTop, LINK_VIEW_PORT_TYPE.X);
        viewMain.onScrollAfterObserver.add((param: IScrollObserverParam) => {
            const { scrollX, scrollY, actualScrollX, actualScrollY } = param;

            viewTop
                .updateScroll({
                    scrollX,
                    actualScrollX,
                })
                .makeDirty(true);

            viewLeft
                .updateScroll({
                    scrollY,
                    actualScrollY,
                })
                .makeDirty(true);
        });

        scene.addViewport(viewMain, viewLeft, viewTop, viewLeftTop).attachControl();

        const scrollbar = new ScrollBar(viewMain, {
            mainScene,
        });

        // 鼠标滚轮缩放
        scene.on(EVENT_TYPE.wheel, (evt: unknown, state: EventState) => {
            const e = evt as IWheelEvent;
            if (e.ctrlKey) {
                const deltaFactor = Math.abs(e.deltaX);
                let scrollNum = deltaFactor < 40 ? 0.05 : deltaFactor < 80 ? 0.02 : 0.01;
                scrollNum *= e.deltaY > 0 ? -1 : 1;
                if (scene.scaleX < 1) {
                    scrollNum /= 2;
                }

                if (scene.scaleX + scrollNum > 4) {
                    scene.scale(4, 4);
                } else if (scene.scaleX + scrollNum < 0.1) {
                    scene.scale(0.1, 0.1);
                } else {
                    scene.scaleBy(scrollNum, scrollNum);
                    e.preventDefault();
                }
            } else {
                viewMain.onMouseWheel(e, state);
            }
        });
    }
}

export class SpreadsheetAdaptorFactory {
    readonly zIndex = 4;

    create(injector: Injector): SpreadsheetAdaptor {
        const spreadsheetAdaptor = injector.createInstance(SpreadsheetAdaptor);
        return spreadsheetAdaptor;
    }
}

CanvasObjectProviderRegistry.add(new SpreadsheetAdaptorFactory());