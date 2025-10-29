/**
 * Diagram examples gallery for onboarding and learning
 */

export interface DiagramExample {
  id: string;
  title: string;
  description: string;
  type: 'mermaid' | 'dbml' | 'graphviz';
  category: 'flowchart' | 'sequence' | 'class' | 'entity' | 'architecture' | 'pipeline';
  code: string;
  prompt: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export const DIAGRAM_EXAMPLES: DiagramExample[] = [
  // ===== MERMAID FLOWCHARTS =====
  {
    id: 'mermaid-1',
    title: 'User Authentication Flow',
    description: 'Complete login and registration flow with validation',
    type: 'mermaid',
    category: 'flowchart',
    difficulty: 'beginner',
    prompt: 'Create a flowchart for user authentication with email validation and password check',
    code: `flowchart TD
    A[User Visits App] --> B{Has Account?}
    B -->|Yes| C[Enter Credentials]
    B -->|No| D[Click Register]
    C --> E{Valid?}
    E -->|No| F[Show Error]
    F --> C
    E -->|Yes| G[Check 2FA]
    G -->|Required| H[Enter 2FA Code]
    H --> I{Valid?}
    I -->|No| J[Error]
    J --> H
    I -->|Yes| K[Login Success]
    D --> L[Enter Email]
    L --> M[Verify Email]
    M --> N[Set Password]
    N --> O[Account Created]
    O --> K`,
  },
  {
    id: 'mermaid-2',
    title: 'E-Commerce Order Processing',
    description: 'Complete order workflow from cart to delivery',
    type: 'mermaid',
    category: 'sequence',
    difficulty: 'intermediate',
    prompt: 'Design a sequence diagram for e-commerce checkout with payment and shipping',
    code: `sequenceDiagram
    participant Customer
    participant Website
    participant PaymentAPI
    participant Warehouse
    participant Shipping
    
    Customer->>Website: Add to Cart
    Customer->>Website: Checkout
    Website->>PaymentAPI: Process Payment
    PaymentAPI-->>Website: Payment Confirmed
    Website->>Warehouse: Create Order
    Warehouse->>Warehouse: Pick Items
    Warehouse->>Warehouse: Pack Box
    Warehouse->>Shipping: Ship Package
    Shipping->>Customer: Delivery Notification
    Customer-->>Website: Confirm Received`,
  },
  {
    id: 'mermaid-3',
    title: 'Software Development Lifecycle',
    description: 'SDLC stages from planning to deployment',
    type: 'mermaid',
    category: 'flowchart',
    difficulty: 'intermediate',
    prompt: 'Create a flowchart showing software development lifecycle stages',
    code: `flowchart LR
    A[Requirements] --> B[Design]
    B --> C[Development]
    C --> D[Testing]
    D --> E{Bugs Found?}
    E -->|Yes| F[Bug Fix]
    F --> D
    E -->|No| G[Code Review]
    G --> H{Approved?}
    H -->|No| I[Revise Code]
    I --> G
    H -->|Yes| J[Deploy to Staging]
    J --> K[UAT Testing]
    K --> L{Ready?}
    L -->|No| M[Fix Issues]
    M --> K
    L -->|Yes| N[Deploy to Production]
    N --> O[Monitor]`,
  },
  {
    id: 'mermaid-4',
    title: 'User Management System',
    description: 'Class diagram showing user, admin, and roles',
    type: 'mermaid',
    category: 'class',
    difficulty: 'advanced',
    prompt: 'Design a class diagram for a user management system with roles',
    code: `classDiagram
    class User {
        -id: string
        -email: string
        -password: string
        -createdAt: Date
        +login()
        +logout()
        +updateProfile()
    }
    
    class Admin {
        -permissions: string[]
        +deleteUser()
        +editUser()
        +viewAnalytics()
    }
    
    class Role {
        -name: string
        -permissions: string[]
        +addPermission()
        +removePermission()
    }
    
    User --|> Admin
    User --> Role`,
  },

  // ===== DBML SCHEMAS =====
  {
    id: 'dbml-1',
    title: 'Blog Database Schema',
    description: 'Database for blog posts, comments, and users',
    type: 'dbml',
    category: 'entity',
    difficulty: 'beginner',
    prompt: 'Design a database schema for a blogging platform',
    code: `Table users {
  id int [primary key]
  email varchar [unique]
  username varchar
  created_at timestamp
}

Table posts {
  id int [primary key]
  user_id int [ref: > users.id]
  title varchar
  content text
  created_at timestamp
  updated_at timestamp
}

Table comments {
  id int [primary key]
  post_id int [ref: > posts.id]
  user_id int [ref: > users.id]
  content text
  created_at timestamp
}

Table likes {
  id int [primary key]
  post_id int [ref: > posts.id]
  user_id int [ref: > users.id]
  created_at timestamp
}`,
  },
  {
    id: 'dbml-2',
    title: 'E-Learning Platform',
    description: 'Database for courses, students, and progress',
    type: 'dbml',
    category: 'entity',
    difficulty: 'intermediate',
    prompt: 'Create a database schema for an online learning platform',
    code: `Table students {
  id int [primary key]
  email varchar [unique]
  name varchar
  enrolled_date timestamp
}

Table courses {
  id int [primary key]
  title varchar
  instructor_id int
  created_at timestamp
}

Table modules {
  id int [primary key]
  course_id int [ref: > courses.id]
  title varchar
  order int
}

Table lessons {
  id int [primary key]
  module_id int [ref: > modules.id]
  title varchar
  content text
}

Table enrollments {
  id int [primary key]
  student_id int [ref: > students.id]
  course_id int [ref: > courses.id]
  progress float
  completed boolean
}

Table quizzes {
  id int [primary key]
  lesson_id int [ref: > lessons.id]
  title varchar
}

Table quiz_answers {
  id int [primary key]
  quiz_id int [ref: > quizzes.id]
  student_id int [ref: > students.id]
  score float
  submitted_at timestamp
}`,
  },

  // ===== GRAPHVIZ ARCHITECTURES =====
  {
    id: 'graphviz-1',
    title: 'Microservices Architecture',
    description: 'Modern microservices system design',
    type: 'graphviz',
    category: 'architecture',
    difficulty: 'intermediate',
    prompt: 'Design a microservices architecture diagram',
    code: `digraph microservices {
  rankdir=LR;
  node [shape=box, style=rounded];
  
  Client [shape=ellipse];
  
  APIGateway [label="API Gateway", style=filled, fillcolor=lightblue];
  
  AuthService [label="Auth Service", style=filled, fillcolor=lightgreen];
  UserService [label="User Service", style=filled, fillcolor=lightgreen];
  OrderService [label="Order Service", style=filled, fillcolor=lightgreen];
  PaymentService [label="Payment Service", style=filled, fillcolor=lightgreen];
  
  Database [label="PostgreSQL", shape=cylinder, style=filled, fillcolor=lightyellow];
  Cache [label="Redis", shape=cylinder, style=filled, fillcolor=lightyellow];
  Queue [label="Message Queue", shape=box, style=filled, fillcolor=lightyellow];
  
  Client -> APIGateway;
  APIGateway -> AuthService;
  APIGateway -> UserService;
  APIGateway -> OrderService;
  APIGateway -> PaymentService;
  
  AuthService -> Database;
  UserService -> Database;
  OrderService -> Database;
  PaymentService -> Database;
  
  AuthService -> Cache;
  UserService -> Cache;
  OrderService -> Queue;
  PaymentService -> Queue;
}`,
  },
  {
    id: 'graphviz-2',
    title: 'CI/CD Pipeline',
    description: 'Continuous integration and deployment workflow',
    type: 'graphviz',
    category: 'pipeline',
    difficulty: 'intermediate',
    prompt: 'Create a CI/CD pipeline diagram',
    code: `digraph cicd {
  rankdir=LR;
  node [shape=box];
  
  Git [shape=ellipse];
  Build [style=filled, fillcolor=lightblue];
  UnitTest [label="Unit Tests", style=filled, fillcolor=lightgreen];
  IntegrationTest [label="Integration Tests", style=filled, fillcolor=lightgreen];
  StagingDeploy [label="Deploy to Staging", style=filled, fillcolor=lightyellow];
  E2ETest [label="E2E Tests", style=filled, fillcolor=lightgreen];
  ProdDeploy [label="Deploy to Production", style=filled, fillcolor=lightcoral];
  Monitor [shape=ellipse];
  
  Git -> Build;
  Build -> UnitTest;
  UnitTest -> IntegrationTest;
  IntegrationTest -> StagingDeploy;
  StagingDeploy -> E2ETest;
  E2ETest -> ProdDeploy;
  ProdDeploy -> Monitor;
}`,
  },
  {
    id: 'graphviz-3',
    title: 'Kubernetes Cluster',
    description: 'Kubernetes cluster architecture',
    type: 'graphviz',
    category: 'architecture',
    difficulty: 'advanced',
    prompt: 'Design a Kubernetes cluster architecture',
    code: `digraph kubernetes {
  rankdir=TB;
  node [shape=box, style=rounded];
  
  Cluster [label="Kubernetes Cluster", shape=component];
  
  ControlPlane [label="Control Plane"];
  APIServer [label="API Server", style=filled, fillcolor=lightblue];
  Scheduler [label="Scheduler", style=filled, fillcolor=lightblue];
  Controller [label="Controller Manager", style=filled, fillcolor=lightblue];
  
  Node1 [label="Worker Node 1"];
  Pod1 [label="Pod", style=filled, fillcolor=lightgreen];
  Pod2 [label="Pod", style=filled, fillcolor=lightgreen];
  
  Node2 [label="Worker Node 2"];
  Pod3 [label="Pod", style=filled, fillcolor=lightgreen];
  Pod4 [label="Pod", style=filled, fillcolor=lightgreen];
  
  Service [label="Service", style=filled, fillcolor=lightyellow];
  Storage [label="Persistent Storage", shape=cylinder, style=filled, fillcolor=lightyellow];
  
  ControlPlane -> APIServer;
  ControlPlane -> Scheduler;
  ControlPlane -> Controller;
  
  APIServer -> Node1;
  APIServer -> Node2;
  
  Node1 -> Pod1;
  Node1 -> Pod2;
  Node2 -> Pod3;
  Node2 -> Pod4;
  
  Pod1 -> Service;
  Pod2 -> Service;
  Pod3 -> Service;
  Pod4 -> Service;
  
  Pod1 -> Storage;
  Pod3 -> Storage;
}`,
  },
];

/**
 * Get examples by type
 */
export const getExamplesByType = (type: 'mermaid' | 'dbml' | 'graphviz'): DiagramExample[] => {
  return DIAGRAM_EXAMPLES.filter(ex => ex.type === type);
};

/**
 * Get examples by difficulty
 */
export const getExamplesByDifficulty = (difficulty: 'beginner' | 'intermediate' | 'advanced'): DiagramExample[] => {
  return DIAGRAM_EXAMPLES.filter(ex => ex.difficulty === difficulty);
};

/**
 * Get examples by category
 */
export const getExamplesByCategory = (category: string): DiagramExample[] => {
  return DIAGRAM_EXAMPLES.filter(ex => ex.category === category);
};