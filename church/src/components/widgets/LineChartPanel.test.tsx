// Basic smoke test placeholder - requires jest/vite test setup which isn't included
import React from 'react'
import { render } from '@testing-library/react'
import LineChartPanel from './LineChartPanel'

test('renders chart placeholder', () => {
  const { getByText } = render(<LineChartPanel data={[]} />)
  expect(getByText(/Temperature Over Time/i)).toBeInTheDocument()
})
