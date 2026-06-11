import AppProvidersWrapper from './components/wrappers/AppProvidersWrapper'
import configureFakeBackend from './helpers/fake-backend'
import AppRouter from './routes/router'
import 'sweetalert2/dist/sweetalert2.css'
import '@/assets/scss/app.scss'

configureFakeBackend() // register mock handlers and allow pass-through

const App = () => {
  return (
    <AppProvidersWrapper>
      <AppRouter />
    </AppProvidersWrapper>
  )
}
export default App
