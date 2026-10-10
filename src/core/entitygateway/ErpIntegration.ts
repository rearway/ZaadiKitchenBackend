export interface ErpMenuRow {
  code: string
  name: string
  description: string
  status: string
}

export interface ErpCustomerRow {
  code: string
  name: string
  mobile: string
  statusCode: number
}

export interface ErpPaymentRow {
  customerCode: string
  menuCode: string
  totalCount: number
  amount: string
}

export interface ErpDailyOrderRow {
  customerCode: string
  menuCode: string
  amount: string
}

export interface ErpPagination {
  offset: number
  limit: number
  total: number
}

export interface ErpIntegrationLoader {
  getMenus(offset: number, limit: number): Promise<{ rows: ErpMenuRow[]; total: number }>
  getCustomers(offset: number, limit: number): Promise<{ rows: ErpCustomerRow[]; total: number }>
  getPayments(
    dateFrom: string,
    dateTo: string,
    offset: number,
    limit: number
  ): Promise<{ rows: ErpPaymentRow[]; total: number }>
  getDailyOrders(
    deliveryDate: string,
    offset: number,
    limit: number
  ): Promise<{ rows: ErpDailyOrderRow[]; total: number }>
}
