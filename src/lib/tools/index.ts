import { benefitsTools } from './benefits'
import { customerToolsContext } from './customer-context'
import { inquiryTools } from './inquiry'
import { savingsTools } from './savings'
import { signalsTools, type SignalsToolContext } from './signals'

export const agentTools = {
  ...inquiryTools,
  ...benefitsTools,
  ...savingsTools,
  ...signalsTools,
}

export function agentToolsContext(params: SignalsToolContext) {
  const signalsContext = {
    customerId: params.customerId,
    domainUserId: params.domainUserId,
    signalsEnabled: params.signalsEnabled,
    clientBehavior: params.clientBehavior,
  }
  return {
    ...customerToolsContext(params.customerId),
    getSignalsAttributes: signalsContext,
    getRecentBenefitVisits: signalsContext,
    suggestNextBenefits: signalsContext,
    suggestNextMerchants: signalsContext,
  }
}

export { customerToolsContext }
