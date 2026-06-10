import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Spinner } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import { useGlobalContext } from '@/context/useGlobalContext'

const AboutUs = () => {
  const navigate = useNavigate()
  const { getAboutUs } = useGlobalContext()

  useEffect(() => {
    const redirectToAboutUs = async () => {
      try {
        const aboutUs = await getAboutUs()
        if (aboutUs) {
          navigate(`/pages/about-us/edit/${aboutUs._id}`, { replace: true })
        } else {
          navigate('/pages/about-us/create', { replace: true })
        }
      } catch (error) {
        console.error('Error fetching About Us page:', error)
        navigate('/pages/about-us/create', { replace: true })
      }
    }
    redirectToAboutUs()
  }, [getAboutUs, navigate])

  return (
    <>
      <PageMetaData title="About Us" />
      <PageBreadcrumb subName="Pages" title="About Us" />
      <div className="text-center p-5">
        <Spinner animation="border" />
      </div>
    </>
  )
}

export default AboutUs
