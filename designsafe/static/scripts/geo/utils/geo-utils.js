function get_file_extension (fname) {
  return fname.split('.').pop().toLowerCase();
}

const RESERVED_KEYS = [
  'label',
  'color',
  'fillColor',
  'fillOpacity',
  'description',
  'image_src',
  'thumb_src',
  'href',
  'metadata'
];

export {RESERVED_KEYS, get_file_extension};
