/**
 * Demo/sample data service - provides example diagrams for testing.
 */

export interface DemoData {
  dbml: string;
  mermaid: string;
  plantuml: string;
  graphviz: string;
}

export function getDemoData(): DemoData {
  return {
    dbml: `Table users {
  id integer [primary key]
  username varchar [unique]
  email varchar [unique]
  password_hash varchar
  created_at timestamp
  updated_at timestamp
}

Table companies {
  id integer [primary key]
  name varchar
  industry varchar
  founded_year integer
}

Table employees {
  id integer [primary key]
  user_id integer [ref: > users.id]
  company_id integer [ref: > companies.id]
  position varchar
  hire_date date
  salary decimal
}

Table departments {
  id integer [primary key]
  company_id integer [ref: > companies.id]
  name varchar
  budget decimal
}

Table assignments {
  id integer [primary key]
  employee_id integer [ref: > employees.id]
  department_id integer [ref: > departments.id]
  role varchar
}`,

    mermaid: `graph TD
    A["User Login"] --> B{Credentials Valid?}
    B -->|No| C["Show Error"]
    C --> A
    B -->|Yes| D["Fetch User Data"]
    D --> E["Load Dashboard"]
    E --> F["Display Welcome"]
    F --> G{User Action}
    G -->|View Profile| H["Show Profile"]
    G -->|View Settings| I["Show Settings"]
    G -->|Logout| J["End Session"]
    H --> K["Back to Dashboard"]
    I --> K
    K --> G`,

    plantuml: `@startuml
!define ABSTRACT abstract

class User {
  -id: int
  -username: string
  -email: string
  +login()
  +logout()
  +getProfile()
}

class Admin {
  -permissions: string[]
  +manageUsers()
  +viewLogs()
}

class Employee {
  -position: string
  -salary: decimal
  +getPayslip()
}

User <|-- Admin
User <|-- Employee
@enduml`,

    graphviz: `digraph microservices {
  rankdir=LR;
  node [shape=box, style=filled, fillcolor=lightblue];
  
  Client [fillcolor=lightyellow];
  Gateway [label="API Gateway"];
  Auth [label="Auth Service"];
  User [label="User Service"];
  Post [label="Post Service"];
  DB [shape=cylinder, label="Database", fillcolor=lightcyan];
  Cache [shape=cylinder, label="Cache", fillcolor=lightcyan];
  
  Client -> Gateway;
  Gateway -> Auth;
  Gateway -> User;
  Gateway -> Post;
  Auth -> DB;
  User -> DB;
  User -> Cache;
  Post -> DB;
  Post -> Cache;
  
  {rank=same; Auth; User; Post;}
}`,
  };
}
