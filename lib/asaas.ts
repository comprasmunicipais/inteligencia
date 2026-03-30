const ASAAS_BASE_URL = process.env.NEXT_PUBLIC_ASAAS_SANDBOX === 'true'
  ? 'https://sandbox.asaas.com/api/v3'
  : 'https://api.asaas.com/api/v3'

async function asaasRequest(path: string, method = 'GET', body?: object) {
  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'access_token': process.env.ASAAS_API_KEY!,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Asaas error ${res.status}: ${error}`)
  }
  return res.json()
}

export async function createAsaasCustomer(params: {
  name: string
  email: string
  cpfCnpj?: string
}) {
  return asaasRequest('/customers', 'POST', params)
}

export async function createAsaasSubscription(params: {
  customer: string
  billingType: 'CREDIT_CARD' | 'BOLETO' | 'PIX'
  value: number
  nextDueDate: string
  cycle: 'MONTHLY' | 'SEMIANNUAL' | 'YEARLY'
  description: string
  creditCard?: {
    holderName: string
    number: string
    expiryMonth: string
    expiryYear: string
    ccv: string
  }
  creditCardHolderInfo?: {
    name: string
    email: string
    cpfCnpj: string
    postalCode: string
    addressNumber: string
    phone?: string
  }
  remoteIp?: string
}) {
  return asaasRequest('/subscriptions', 'POST', params)
}

export async function createAsaasPayment(params: {
  customer: string
  billingType: 'CREDIT_CARD' | 'BOLETO' | 'PIX'
  value: number
  dueDate: string
  description: string
}) {
  return asaasRequest('/payments', 'POST', params)
}

export async function getAsaasPayment(paymentId: string) {
  return asaasRequest(`/payments/${paymentId}`)
}

export async function cancelAsaasSubscription(subscriptionId: string) {
  return asaasRequest(`/subscriptions/${subscriptionId}`, 'DELETE')
}

export async function getAsaasCustomer(customerId: string) {
  return asaasRequest(`/customers/${customerId}`)
}
