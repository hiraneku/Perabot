import React from 'react';
import { X, Smartphone, Monitor, Magnet, Layers, Grid3x3 } from 'lucide-react';

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Panduan Penggunaan Perabot 3D"
      >
        <div className="modal-header">
          <h3>Panduan Lengkap Perabot 3D Studio</h3>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-grid">
          <div className="help-box">
            <div className="help-box-title">
              <Smartphone size={16} />
              <span>Basic Shapes & Sentuh</span>
            </div>
            <ul className="help-list">
              <li>
                <strong>Basic Shapes (24 Bentuk):</strong> Ketuk bentuk untuk menambahkannya ke kanvas, atau <strong>tekan agak lama (~0.4 detik)</strong> untuk melihat kartu penjelasan fungsi arsitekturnya.
              </li>
              <li>
                <strong>1 / 2 Jari:</strong> 1 jari memutar kamera; 2 jari zoom & geser.
              </li>
              <li>
                <strong>Panah RGB:</strong>{' '}
                <span className="txt-x">Merah (X)</span>,{' '}
                <span className="txt-y">Hijau (Y)</span>,{' '}
                <span className="txt-z">Biru (Z)</span>.
              </li>
            </ul>
          </div>

          <div className="help-box">
            <div className="help-box-title">
              <Monitor size={16} />
              <span>Pintasan ala Blender</span>
            </div>
            <ul className="help-list">
              <li>
                <kbd>G</kbd> / <kbd>R</kbd> / <kbd>S</kbd> / <kbd>T</kbd> — Mode Geser / Putar / Skala / <strong>Tempel Permukaan</strong>
              </li>
              <li>
                <kbd>F</kbd> — Fokus kamera ke objek terpilih
              </li>
              <li>
                <kbd>Shift + D</kbd> — Duplikat objek terpilih
              </li>
              <li>
                <kbd>Delete</kbd> / <kbd>X</kbd> — Hapus objek
              </li>
              <li>
                <kbd>Ctrl + Z</kbd> / <kbd>Ctrl + Y</kbd> — Undo / Redo
              </li>
            </ul>
          </div>

          <div className="help-box">
            <div className="help-box-title">
              <Layers size={16} />
              <span>Surface Alignment & Terrain</span>
            </div>
            <ul className="help-list">
              <li>
                <strong>Alat Tempel (<kbd>T</kbd>):</strong> Seret objek terpilih langsung menelusuri atap miring, dinding, kubah, atau kontur bukit.
              </li>
              <li>
                <strong>Ikuti Normal:</strong> Objek miring otomatis mengikuti sudut permukaan (Align to Surface Normal).
              </li>
              <li>
                <strong>Tegak Kontur & Fondasi Lereng:</strong> Tetap vertikal mengikuti tinggi tanah atau menanam sudut terendah ke lereng agar fondasi tidak melayang.
              </li>
            </ul>
          </div>

          <div className="help-box">
            <div className="help-box-title">
              <Grid3x3 size={16} />
              <span>World, Tile & Terrain Grid</span>
            </div>
            <ul className="help-list">
              <li>
                <strong>4 Gaya Grid:</strong> <em>World Wire Grid</em>, <em>Tile Grid</em> (ubin lantai), <em>Blueprint CAD</em>, dan <em>Terrain 3D</em> (Bukit, Lembah, Terasering).
              </li>
              <li>
                <strong>Spasi & Elevasi:</strong> Ubah spasi petak (<code>0.1m–2.5m</code>), sinkronkan otomatis dengan Snap Grid, dan naikkan elevasi lantai kerja (Lt.1 / Lt.2 / Lt.3).
              </li>
            </ul>
          </div>

          <div className="help-box help-box-full">
            <div className="help-box-title">
              <Magnet size={16} />
              <span>3 Fitur Snap Pintar</span>
            </div>
            <ul className="help-list">
              <li>
                <strong>Magnet Blok & Sudut:</strong> Menarik permukaan, garis tepi, dan sudut secara mulus saat blok berdekatan tanpa garis sambungan.
              </li>
              <li>
                <strong>Garis Sejajar (Alignment):</strong> Garis bantu laser untuk meluruskan posisi dengan objek jauh.
              </li>
              <li>
                <strong>Snap Grid:</strong> Mengunci langkah geser & skala ke spasi petak meter aktif.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
