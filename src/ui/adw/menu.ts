export interface MenuItem {
  label: string;
  accel?: string;
  /** undefined = not a check item; true/false = check item state. */
  checked?: boolean;
  /** A check item that is one of a set of exclusive choices (menuitemradio), like a sort order. */
  radio?: boolean;
  /** Leave the menu open after the action (check items toggled several at a time). */
  keepOpen?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  action?: () => void;
  submenu?: () => MenuModel;
}

export interface MenuModel {
  /** Shown as the back row when this model is a submenu. */
  title?: string;
  sections: MenuItem[][];
}
