# About the project
This project is used to power protogen fursuit heads providing a web interface for controlling various aspects of the head such as the expression, RGB effects, and more. The project consists of a backend written in TypeScript using Node.js and Express, and a frontend written in Angular. The face gets rendered on hub75 displays with the use of [flaschen-taschen](https://github.com/hzeller/flaschen-taschen).

The project is intended to run on a raspberry pi 4 or similar single board computer so we need to be mindful of performance and resource usage when writing code for this project.

The client communicates with the backend using both a REST API and a socket.io connection, both of these needs to be secure and use authentication to prevent unauthorized access.

# Guidelines for GitHub Copilot

## Global (All Files)
- Maintain a consistent code style across the entire codebase.
- Use descriptive variable and function names.
- Keep code modular and reusable.

---

## Frontend (Angular)

### Error Handling
- API services should NOT include error handling (no `catchError` or `throwError`).
- Error handling belongs in the consuming component's `subscribe()` callbacks.
- When making web requests, always handle errors in the components. This can range from just logging with console.error to showing a friendly error message in the UI using the toast notification library ToastService.
- Use 'return []' when handling http errors to stop the subscription from propagating.

### Code Style
- Use signals for reactive state management.
- Use `computed()` for derived state.
- Prefer `inject()` over constructor injection.
- Prefer input and output over @Input and @Output for component communication.
- Prefer viewChild over @ViewChild for accessing child components and elements.
- Always use the readonly keyword for signals and computed properties.
- Use the private or protected keyword for component methods and properties that are not needed to be externally accessible.
- In RxJS always use pipe(catchError()) instead of handling errors in the subscribe() callback.

### Design
- Use bootstrap for styling and layout.
- Use bootstrap icons for icons.
- Use a modern card based design for the UI.
- Make sure to adapt the design to support both dark and light mode using the data-bs-theme attribute.
- Always have a mobile friendly design that works well on smaller screens.

---

## Backend (TypeScript/Node.js)

### Code Style
- Try to avoid the use of the any type.
- Prefer async/await over raw promises.
- Use proper type definitions for all public APIs.
- Always use the public, protected, or private keywords for class methods and properties.