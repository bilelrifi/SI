pipeline {
  agent {
    kubernetes {
      yaml """
apiVersion: v1
kind: Pod
metadata:
  labels:
    app: multi-agent
spec:
  containers:
  - name: nodejs
    image: node:18
    command:
    - cat
    tty: true
"""
    }
  }

  stages {
        stage('Node') {
          steps {
            container('nodejs') {
              sh 'node -v'
            }
          }
        }    
    }
}
