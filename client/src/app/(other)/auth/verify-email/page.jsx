import React from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

const VerifyEmailCard = () => {
  const navigate = useNavigate()

  const handleLoginRedirect = () => {
    navigate('/auth/sign-in')
  }

  return (
    <Container>
      <Card>
        <h2>We've sent you an email. Please verify to be able to login!</h2>
        <LoginButton onClick={handleLoginRedirect}>Back to Login</LoginButton>
      </Card>
    </Container>
  )
}

// Styled Components
const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f0f0f0;
`

const Card = styled.div`
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  background-color: #fff;
  text-align: center;
  max-width: 400px;
  width: 90%;
`

const LoginButton = styled.button`
  margin-top: 20px;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  background-color: #2db4a0;
  color: #ffffff;
  cursor: pointer;
  font-family: inherit;
  font-size: inherit;
  transition: background-color 0.3s;

  &:hover {
    background-color: #009782;
  }
`

export default VerifyEmailCard
