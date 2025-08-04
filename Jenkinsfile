pipeline {
    agent any

    environment {
        PROJECT_NAME = "gamma"
        OPENSHIFT_SERVER = "https://api.ocp.smartek.ae:6443" 
        OPENSHIFT_TOKEN = credentials('oc-token-id')
        REGISTRY_CREDENTIALS = credentials('f990f24e-9b6e-4728-b4ef-8dd4392b500d')

        FRONTEND_IMAGE = "quay.io/bilelrifi/job-portal-frontend:p"
        BACKEND_IMAGE = "quay.io/bilelrifi/job-portal-backend:p"

        FRONTEND_CONTEXT = "frontend"
        BACKEND_CONTEXT = "backend"
    }

    stages {
        stage('Clone Repo') {
            steps {
                checkout scm
            }
        }

        stage('Build Frontend Image') {
            steps {
                sh """
                    podman build -f ${FRONTEND_CONTEXT}/Containerfile -t ${FRONTEND_IMAGE} ${FRONTEND_CONTEXT}
                """
            }
        }

        stage('Build Backend Image') {
            steps {
                sh """
                    podman build -f ${BACKEND_CONTEXT}/Containerfile -t ${BACKEND_IMAGE} ${BACKEND_CONTEXT}
                """
            }
        }

        stage('Push Images to Quay') {
            steps {
                withCredentials([usernamePassword(credentialsId: "${REGISTRY_CREDENTIALS}", passwordVariable: 'QUAY_PASS', usernameVariable: 'QUAY_USER')]) {
                    sh """
                        podman login quay.io -u $QUAY_USER -p $QUAY_PASS
                        podman push ${FRONTEND_IMAGE}
                        podman push ${BACKEND_IMAGE}
                    """
                }
            }
        }

        stage('Deploy to OpenShift') {
            steps {
                withCredentials([string(credentialsId: "${OPENSHIFT_TOKEN}", variable: 'OC_TOKEN')]) {
                    sh """
                        oc login --token=$OC_TOKEN --server=${OPENSHIFT_SERVER} --insecure-skip-tls-verify
                        oc project ${PROJECT_NAME}

                        # Clean existing apps
                        oc delete all -l app=job-frontend || true
                        oc delete all -l app=job-backend || true

                        # Deploy frontend
                        oc new-app ${FRONTEND_IMAGE} --name=job-frontend
                        oc expose svc/job-frontend

                        # Deploy backend
                        oc new-app ${BACKEND_IMAGE} --name=job-backend
                        oc expose svc/job-backend
                    """
                }
            }
        }
    }
}
