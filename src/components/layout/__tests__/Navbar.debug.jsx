import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Navbar } from '../Navbar';

// Simple test to debug the Navbar component structure
describe('Navbar Debug', () => {
  it('should render the Navbar component and log its structure', () => {
    // Render the Navbar component
    const { container } = render(
      <MemoryRouter>
        <Navbar onMenuClick={() => {}} />
      </MemoryRouter>
    );

    // Log the rendered HTML structure
    console.log('Rendered Navbar HTML:');
    console.log(container.innerHTML);

    // Log all elements with their roles
    console.log('\nAll elements with roles:');
    const allElements = container.querySelectorAll('*');
    allElements.forEach((el, index) => {
      if (el.getAttribute('role')) {
        console.log(`Element ${index + 1}:`, {
          tag: el.tagName,
          role: el.getAttribute('role'),
          text: el.textContent?.trim(),
          'aria-label': el.getAttribute('aria-label'),
          class: el.className,
          id: el.id,
        });
      }
    });

    // Log all buttons and links
    console.log('\nAll buttons and links:');
    const buttons = container.querySelectorAll('button, [role="button"], a');
    buttons.forEach((btn, index) => {
      console.log(`Button/Link ${index + 1}:`, {
        tag: btn.tagName,
        text: btn.textContent?.trim(),
        'aria-label': btn.getAttribute('aria-label'),
        href: btn.getAttribute('href'),
        class: btn.className,
      });
    });
  });
});
