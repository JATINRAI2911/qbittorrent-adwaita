export interface MenuItem {
  label: string;
  accel?: string;
  /** undefined = not a check item; true/false = check item state. */
  checked?: boolean;
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
