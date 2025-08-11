pipeline {
    agent {
        kubernetes {
            yaml """
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: podman
    image: quay.io/podman/stable:latest
    command: ['cat']
    tty: true
  - name: kubectl
    image: lachlanevenson/k8s-kubectl:latest
    command: ['cat']
    tty: true
  - name: jnlp
    image: jenkins/inbound-agent:3107.v665000b_51092-15
    env:
    - name: HOME
      value: /home/jenkins
"""
        }
    }

    environment {
        PROJECT_NAME        = "gamma"
        OPENSHIFT_SERVER    = "https://api.ocp.smartek.ae:6443"
        REGISTRY_CREDENTIALS = "ce45edfb-ce9a-42be-aa16-afea0bdc5dfc"
        IMAGE_TAG           = "build-${BUILD_NUMBER}"
        FRONTEND_IMAGE      = "quay.io/bilelrifi/job-portal-frontend:${IMAGE_TAG}"
        BACKEND_IMAGE       = "quay.io/bilelrifi/job-portal-backend:${IMAGE_TAG}"
    }

    stages {
        stage('Clone Repository') {
            steps {
                checkout scm
            }
        }

        stage('Login to OpenShift') {
            steps {
                container('kubectl') {
                    withCredentials([string(credentialsId: 'oc-token-id', variable: 'OC_TOKEN')]) {
                        sh '''
                            echo "Logging into OpenShift..."
                            oc login --token=$OC_TOKEN --server=$OPENSHIFT_SERVER --insecure-skip-tls-verify
                            oc project $PROJECT_NAME
                        '''
                    }
                }
            }
        }

        stage('Build & Push Images (Parallel)') {
            parallel {
                stage('Frontend') {
                    steps {
                        container('podman') {
                            withCredentials([usernamePassword(credentialsId: "${REGISTRY_CREDENTIALS}", passwordVariable: 'QUAY_PASS', usernameVariable: 'QUAY_USER')]) {
                                sh '''
                                    podman login quay.io -u $QUAY_USER -p $QUAY_PASS
                                    echo "Building frontend image: $FRONTEND_IMAGE"
                                    podman build -t $FRONTEND_IMAGE -f frontend/Dockerfile .
                                    podman push $FRONTEND_IMAGE
                                '''
                            }
                        }
                    }
                }
                stage('Backend') {
                    steps {
                        container('podman') {
                            withCredentials([usernamePassword(credentialsId: "${REGISTRY_CREDENTIALS}", passwordVariable: 'QUAY_PASS', usernameVariable: 'QUAY_USER')]) {
                                sh '''
                                    podman login quay.io -u $QUAY_USER -p $QUAY_PASS
                                    echo "Building backend image: $BACKEND_IMAGE"
                                    podman build -t $BACKEND_IMAGE -f backend/Dockerfile .
                                    podman push $BACKEND_IMAGE
                                '''
                            }
                        }
                    }
                }
            }
        }

        stage('Deploy Applications') {
            steps {
                container('kubectl') {
                    withCredentials([string(credentialsId: 'oc-token-id', variable: 'OC_TOKEN')]) {
                        sh '''
                            oc login --token=$OC_TOKEN --server=$OPENSHIFT_SERVER --insecure-skip-tls-verify
                            oc project $PROJECT_NAME

                            echo "Removing existing applications..."
                            oc delete all -l app=job-frontend || true
                            oc delete all -l app=job-backend || true

                            echo "Deploying frontend..."
                            oc new-app $FRONTEND_IMAGE --name=job-frontend
                            oc expose svc/job-frontend

                            echo "Deploying backend..."
                            oc new-app $BACKEND_IMAGE --name=job-backend
                            oc expose svc/job-backend
                        '''
                    }
                }
            }
        }

        stage('Cleanup') {
            steps {
                container('podman') {
                    sh '''
                        echo "Cleaning up unused Podman images..."
                        podman rmi -f $(podman images -q) || true
                    '''
                }
            }
        }
    }
}
