pipeline {
    agent {
        kubernetes {
            yaml """
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: buildah
      image: quay.io/buildah/stable:v1.35.4
      command:
        - cat
      tty: true
      securityContext:
        privileged: true
      volumeMounts:
        - name: containers-storage
          mountPath: /var/lib/containers
  volumes:
    - name: containers-storage
      emptyDir: {}
"""
        }
    }

    environment {
        PROJECT_NAME = "gamma"
        OPENSHIFT_SERVER = "https://api.ocp.smartek.ae:6443"
        REGISTRY_CREDENTIALS = 'ce45edfb-ce9a-42be-aa16-afea0bdc5dfc'
        FRONTEND_IMAGE = "quay.io/bilelrifi/job-portal-frontend:p"
        BACKEND_IMAGE = "quay.io/bilelrifi/job-portal-backend:p"
    }

    stages {
        stage('Clone Repo') {
            steps {
                checkout scm
            }
        }

        stage('Build Frontend') {
            steps {
                container('buildah') {
                    withCredentials([usernamePassword(credentialsId: "${REGISTRY_CREDENTIALS}", passwordVariable: 'QUAY_PASS', usernameVariable: 'QUAY_USER')]) {
                        sh '''
                            echo "Logging into Quay..."
                            buildah login -u "$QUAY_USER" -p "$QUAY_PASS" quay.io

                            echo "Building frontend image..."
                            cd frontend
                            buildah bud -t ${FRONTEND_IMAGE} .

                            echo "Pushing frontend image..."
                            buildah push ${FRONTEND_IMAGE}
                        '''
                    }
                }
            }
        }

        stage('Build Backend') {
            steps {
                container('buildah') {
                    withCredentials([usernamePassword(credentialsId: "${REGISTRY_CREDENTIALS}", passwordVariable: 'QUAY_PASS', usernameVariable: 'QUAY_USER')]) {
                        sh '''
                            echo "Logging into Quay..."
                            buildah login -u "$QUAY_USER" -p "$QUAY_PASS" quay.io

                            echo "Building backend image..."
                            cd backend
                            buildah bud -t ${BACKEND_IMAGE} .

                            echo "Pushing backend image..."
                            buildah push ${BACKEND_IMAGE}
                        '''
                    }
                }
            }
        }

        stage('Deploy from Quay') {
            steps {
                container('buildah') {
                    withCredentials([string(credentialsId: 'oc-token-id', variable: 'OC_TOKEN')]) {
                        sh '''
                            echo "Deploying from Quay..."
                            oc login --token=$OC_TOKEN --server=${OPENSHIFT_SERVER} --insecure-skip-tls-verify
                            oc project ${PROJECT_NAME}

                            oc delete all -l app=job-frontend --ignore-not-found=true
                            oc delete all -l app=job-backend --ignore-not-found=true

                            sleep 10

                            oc new-app ${FRONTEND_IMAGE} --name=job-frontend
                            oc expose svc/job-frontend

                            oc new-app ${BACKEND_IMAGE} --name=job-backend
                            oc expose svc/job-backend

                            oc get pods
                            oc get svc
                            oc get routes
                        '''
                    }
                }
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully!'
        }
        failure {
            echo 'Pipeline failed. Check the logs for details.'
        }
    }
}
