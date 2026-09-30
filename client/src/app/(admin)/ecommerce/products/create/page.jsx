import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import CreateProductForms from './components/CreateProductForms'

const CreateProduct = () => (
  <>
    <PageMetaData title="Create Product" />
    <PageBreadcrumb title="Create Product" subName="Shop" />
    <CreateProductForms />
  </>
)

export default CreateProduct
