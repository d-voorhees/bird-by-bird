import { gql } from "@apollo/client";

export const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      emailVerified
      createdAt
    }
  }
`;

export const CURRENT_BIRD_QUERY = gql`
  query CurrentBird {
    currentBird {
      id
      title
      notes
      status
      position
      birdImage
      createdAt
    }
  }
`;

export const FLOCK_QUERY = gql`
  query Flock {
    flock {
      id
      title
      notes
      status
      position
      birdImage
      createdAt
    }
  }
`;

export const HISTORY_QUERY = gql`
  query History($limit: Int!, $offset: Int!) {
    history(limit: $limit, offset: $offset) {
      id
      title
      notes
      status
      birdImage
      completedAt
      createdAt
    }
  }
`;

export const SIGN_UP_MUTATION = gql`
  mutation SignUp($email: String!, $password: String!) {
    signUp(email: $email, password: $password) {
      token
      user {
        id
        email
      }
    }
  }
`;

export const SIGN_IN_MUTATION = gql`
  mutation SignIn($email: String!, $password: String!) {
    signIn(email: $email, password: $password) {
      token
      user {
        id
        email
      }
    }
  }
`;

export const SIGN_OUT_MUTATION = gql`
  mutation SignOut {
    signOut
  }
`;

export const ADD_TASK_MUTATION = gql`
  mutation AddTask($title: String!, $notes: String, $doNext: Boolean) {
    addTask(title: $title, notes: $notes, doNext: $doNext) {
      id
      title
      notes
      position
      status
      birdImage
      createdAt
    }
  }
`;

export const COMPLETE_TASK_MUTATION = gql`
  mutation CompleteTask($id: ID!) {
    completeTask(id: $id) {
      id
      status
      completedAt
    }
  }
`;

export const SKIP_TASK_MUTATION = gql`
  mutation SkipTask($id: ID!) {
    skipTask(id: $id) {
      id
      position
    }
  }
`;

export const UPDATE_TASK_MUTATION = gql`
  mutation UpdateTask($id: ID!, $title: String, $notes: String) {
    updateTask(id: $id, title: $title, notes: $notes) {
      id
      title
      notes
    }
  }
`;

export const DELETE_TASK_MUTATION = gql`
  mutation DeleteTask($id: ID!) {
    deleteTask(id: $id) {
      ok
    }
  }
`;

export const ABANDON_TASK_MUTATION = gql`
  mutation AbandonTask($id: ID!) {
    abandonTask(id: $id) {
      id
      status
    }
  }
`;

export const REORDER_TASKS_MUTATION = gql`
  mutation ReorderTasks($orderedIds: [ID!]!) {
    reorderTasks(orderedIds: $orderedIds) {
      id
      title
      position
    }
  }
`;

export const PROMOTE_TASK_MUTATION = gql`
  mutation PromoteTask($id: ID!) {
    promoteTask(id: $id) {
      id
      position
    }
  }
`;

export const UNCOMPLETE_TASK_MUTATION = gql`
  mutation UncompleteTask($id: ID!) {
    uncompleteTask(id: $id) {
      id
      status
      position
      completedAt
    }
  }
`;

export const CLEAR_HISTORY_MUTATION = gql`
  mutation ClearHistory {
    clearHistory {
      ok
      deletedCount
    }
  }
`;

export const VERIFY_EMAIL_MUTATION = gql`
  mutation VerifyEmail($token: String!) {
    verifyEmail(token: $token) {
      ok
      user {
        id
        email
        emailVerified
      }
    }
  }
`;

export const RESEND_VERIFICATION_EMAIL_MUTATION = gql`
  mutation ResendVerificationEmail {
    resendVerificationEmail {
      ok
    }
  }
`;

export const REQUEST_PASSWORD_RESET_MUTATION = gql`
  mutation RequestPasswordReset($email: String!) {
    requestPasswordReset(email: $email) {
      ok
    }
  }
`;

export const RESET_PASSWORD_MUTATION = gql`
  mutation ResetPassword($token: String!, $password: String!) {
    resetPassword(token: $token, password: $password) {
      ok
    }
  }
`;
