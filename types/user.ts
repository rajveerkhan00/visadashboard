export interface UserFormData {
  uid?: string;
  createdAt?: any;
  status?: string;
  step?: string;
  [key: string]: any;
}

export interface UserForms {
  firstform?: UserFormData;
  secondform?: UserFormData;
  thirdform?: UserFormData;
  fourthform?: UserFormData;
  fifthform?: UserFormData;
  sixthform?: UserFormData;
  seventhform?: UserFormData;
  eighthform?: UserFormData;
}