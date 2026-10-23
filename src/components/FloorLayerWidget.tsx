import React from 'react';
import {
  Building2,
  Copy,
  Eye,
  EyeOff,
  Ghost,
  Layers,
  Lock,
  Plus,
  Scissors,
  Trash2,
  Unlock,
  X,
} from 'lucide-react';
import { TRANSLATIONS } from '../i18n/translations';
import {
  AppLanguage,
  BuildingFloorLayer,
  FloorViewMode,
  SceneObjectData,
} from '../types/studio';

interface FloorLayerWidgetProps {
  open: boolean;
  language: AppLanguage;
  floors: BuildingFloorLayer[];
  activeFloorId: string;
  floorViewMode: FloorViewMode;
  objects: SceneObjectData[];
  onSelectFloor: (floorId: string) => void;
  onAddFloor: () => void;
  onRemoveFloor: (floorId: string) => void;
  onUpdateFloor: (
    floorId: string,
    patch: Partial<BuildingFloorLayer>
  ) => void;
  onChangeViewMode: (mode: FloorViewMode) => void;
  onCopyLowerFloorWalls?: () => void;
  onClose: () => void;
}

export const FloorLayerWidget: React.FC<FloorLayerWidgetProps> = ({
  open,
  language,
  floors,
  activeFloorId,
  floorViewMode,
  objects,
  onSelectFloor,
  onAddFloor,
  onRemoveFloor,
  onUpdateFloor,
  onChangeViewMode,
  onCopyLowerFloorWalls,
  onClose,
}) => {
  const t = TRANSLATIONS[language];
  if (!open) return null;

  // Stack highest floor at top (like a real building section)
  const stackedFloors = [...floors].sort(
    (a, b) => b.elevation - a.elevation
  );
  const sortedAsc = [...floors].sort((a, b) => a.elevation - b.elevation);
  const activeAscIdx = sortedAsc.findIndex((f) => f.id === activeFloorId);
  const hasLowerFloor = activeAscIdx > 0;
  const activeFl = floors.find((f) => f.id === activeFloorId) ?? floors[0];

  return (
    <div
      className="floating-tool-card floor-layer-card"
      role="region"
      aria-label={t.floorSystemTitle}
    >
      <div className="floating-card-head">
        <div className="floating-card-title">
          <span className="floating-card-badge amber">
            <Building2 size={15} />
          </span>
          <div>
            <strong>{t.floorSystemTitle}</strong>
            <small>{activeFl ? `${activeFl.name} (Y=${activeFl.elevation.toFixed(1)}m)` : ''}</small>
          </div>
        </div>
        <button
          type="button"
          className="icon-close-btn"
          onClick={onClose}
          aria-label={t.done}
        >
          <X size={17} />
        </button>
      </div>

      {/* View Mode Selector: All | Cutaway Above | Ghost Others */}
      <div className="repeat-mode-tabs">
        <button
          type="button"
          className={`repeat-tab-btn ${
            floorViewMode === 'all' ? 'active' : ''
          }`}
          onClick={() => onChangeViewMode('all')}
        >
          <Layers size={13} />
          <span>{t.floorViewAll}</span>
        </button>
        <button
          type="button"
          className={`repeat-tab-btn ${
            floorViewMode === 'cutaway-above' ? 'active' : ''
          }`}
          onClick={() => onChangeViewMode('cutaway-above')}
        >
          <Scissors size={13} />
          <span>{t.floorViewCutaway}</span>
        </button>
        <button
          type="button"
          className={`repeat-tab-btn ${
            floorViewMode === 'ghost-others' ? 'active' : ''
          }`}
          onClick={() => onChangeViewMode('ghost-others')}
        >
          <Ghost size={13} />
          <span>{t.floorViewGhost}</span>
        </button>
      </div>

      {/* Stacked Story List */}
      <div className="floor-stack-list">
        {stackedFloors.map((fl) => {
          const isActive = fl.id === activeFloorId;
          const countOnFloor = objects.filter((o) => o.floorId === fl.id).length;
          return (
            <div
              key={fl.id}
              className={`floor-layer-row ${isActive ? 'active' : ''}`}
              onClick={() => onSelectFloor(fl.id)}
            >
              <div className="floor-row-main">
                <input
                  type="text"
                  className="floor-name-input"
                  value={fl.name}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    onUpdateFloor(fl.id, { name: e.target.value })
                  }
                />
                <span className="floor-elev-tag">
                  Y={fl.elevation.toFixed(1)}m · {countOnFloor}
                </span>
              </div>

              <div
                className="floor-row-actions"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="tiny-icon-btn"
                  title={fl.visible ? t.hideObject : t.showObject}
                  onClick={() =>
                    onUpdateFloor(fl.id, { visible: !fl.visible })
                  }
                >
                  {fl.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                </button>
                <button
                  type="button"
                  className={`tiny-icon-btn ${fl.locked ? 'active' : ''}`}
                  title={t.floorAssignLabel}
                  onClick={() => onUpdateFloor(fl.id, { locked: !fl.locked })}
                >
                  {fl.locked ? <Lock size={13} /> : <Unlock size={13} />}
                </button>
                {floors.length > 1 && (
                  <button
                    type="button"
                    className="tiny-icon-btn danger"
                    title={t.delete}
                    onClick={() => onRemoveFloor(fl.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {hasLowerFloor && onCopyLowerFloorWalls && (
        <button
          type="button"
          className="floor-copy-walls-btn"
          onClick={onCopyLowerFloorWalls}
        >
          <Copy size={13} />
          <span>{t.archCopyLowerWallsBtn}</span>
        </button>
      )}

      <button type="button" className="floor-add-btn" onClick={onAddFloor}>
        <Plus size={14} />
        <span>{t.floorAddBtn}</span>
      </button>
    </div>
  );
};
