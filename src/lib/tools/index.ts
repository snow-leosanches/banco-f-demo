import { benefitsTools } from './benefits'
import { customerToolsContext } from './customer-context'
import { inquiryTools } from './inquiry'
import { savingsTools } from './savings'

export const agentTools = {
  ...inquiryTools,
  ...benefitsTools,
  ...savingsTools,
}

export { customerToolsContext }
