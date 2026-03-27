/**
 * CSS Properties type definition.
 *
 * Uses a subset of commonly used CSS properties with proper typing.
 * Additional properties can be added via the string index signature.
 */
export interface CSSProperties {
  // Display & Layout
  display?: string;
  position?: string;
  overflow?: string;
  overflowX?: string;
  overflowY?: string;
  visibility?: string;
  zIndex?: number | string;
  float?: string;
  clear?: string;

  // Flexbox
  flexDirection?: string;
  flexWrap?: string;
  justifyContent?: string;
  alignItems?: string;
  alignContent?: string;
  alignSelf?: string;
  flex?: string | number;
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: string | number;
  gap?: string | number;
  rowGap?: string | number;
  columnGap?: string | number;
  order?: number;

  // Grid
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gridColumn?: string;
  gridRow?: string;
  gridArea?: string;
  gridGap?: string | number;

  // Box Model
  width?: string | number;
  height?: string | number;
  minWidth?: string | number;
  maxWidth?: string | number;
  minHeight?: string | number;
  maxHeight?: string | number;
  margin?: string | number;
  marginTop?: string | number;
  marginRight?: string | number;
  marginBottom?: string | number;
  marginLeft?: string | number;
  padding?: string | number;
  paddingTop?: string | number;
  paddingRight?: string | number;
  paddingBottom?: string | number;
  paddingLeft?: string | number;
  boxSizing?: string;

  // Position
  top?: string | number;
  right?: string | number;
  bottom?: string | number;
  left?: string | number;

  // Border
  border?: string;
  borderTop?: string;
  borderRight?: string;
  borderBottom?: string;
  borderLeft?: string;
  borderWidth?: string | number;
  borderStyle?: string;
  borderColor?: string;
  borderRadius?: string | number;
  borderTopLeftRadius?: string | number;
  borderTopRightRadius?: string | number;
  borderBottomLeftRadius?: string | number;
  borderBottomRightRadius?: string | number;

  // Background
  background?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  backgroundRepeat?: string;

  // Typography
  color?: string;
  fontSize?: string | number;
  fontWeight?: string | number;
  fontFamily?: string;
  fontStyle?: string;
  lineHeight?: string | number;
  letterSpacing?: string | number;
  textAlign?: string;
  textDecoration?: string;
  textTransform?: string;
  whiteSpace?: string;
  wordBreak?: string;
  textOverflow?: string;

  // Effects
  opacity?: number | string;
  boxShadow?: string;
  textShadow?: string;
  transform?: string;
  transformOrigin?: string;
  transition?: string;
  animation?: string;
  filter?: string;
  backdropFilter?: string;

  // Cursor & Interaction
  cursor?: string;
  pointerEvents?: string;
  userSelect?: string;

  // Misc
  objectFit?: string;
  objectPosition?: string;
  listStyle?: string;
  outline?: string;
  content?: string;

  /** Allow any additional CSS property */
  [key: string]: string | number | undefined;
}
