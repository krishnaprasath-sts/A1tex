import ResourceListPage from './ResourceListPage'
import { resources } from '../app/resources'

const couponsResourceConfig = resources.find(r => r.path === '/coupons')!

export default function CouponsListPage() {
  return <ResourceListPage config={couponsResourceConfig} />
}
