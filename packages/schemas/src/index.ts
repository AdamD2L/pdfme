import text, { readOnlyText } from './text/index.js';
import image, { readOnlyImage } from './graphics/image.js';
import svg, { readOnlySvg } from './graphics/svg.js';
import barcodes from './barcodes/index.js';
import line from './shapes/line.js';
import table from './tables/table.js';
import { autoTable } from './tables/tableHelper.js';
import cell from './tables/cell.js';
import { rectangle, ellipse } from './shapes/rectAndEllipse.js';
import { convertForPdfLayoutProps, rotatePoint } from './utils.js';

const builtInPlugins = { Text: text };

export {
  text,
  readOnlyText,
  image,
  readOnlyImage,
  svg,
  readOnlySvg,
  barcodes,
  line,
  table,
  // TODO 最終的にcellはエクスポートしない
  cell,
  autoTable,
  rectangle,
  ellipse,
  builtInPlugins,
  convertForPdfLayoutProps,
  rotatePoint,
};
