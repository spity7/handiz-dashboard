import AppProvidersWrapper from './components/wrappers/AppProvidersWrapper'
import configureFakeBackend from './helpers/fake-backend'
import AppRouter from './routes/router'
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
