pipeline {
    agent any

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

        stage('Login to OpenShift') {
            steps {
                withCredentials([string(credentialsId: 'oc-token-id', variable: 'OC_TOKEN')]) {
                    sh '''
                        echo "Logging into OpenShift..."
                        oc login --token=$OC_TOKEN --server=${OPENSHIFT_SERVER} --insecure-skip-tls-verify
                        oc project ${PROJECT_NAME}
                        echo "Logged into OpenShift project: ${PROJECT_NAME}"
                    '''
                }
            }
        }

        stage('Build Images with Docker/Podman') {
            parallel {
                stage('Build Frontend Image') {
                    steps {
                        script {
                            withCredentials([usernamePassword(credentialsId: "${REGISTRY_CREDENTIALS}", passwordVariable: 'QUAY_PASS', usernameVariable: 'QUAY_USER')]) {
                                sh '''
                                    echo "Building frontend image with Docker/Podman..."
                                    cd frontend
                                    
                                    # Check if we have Docker or Podman
                                    if command -v podman &> /dev/null; then
                                        BUILD_CMD="podman"
                                    elif command -v docker &> /dev/null; then
                                        BUILD_CMD="docker"
                                    else
                                        echo "Neither Docker nor Podman found, trying buildah..."
                                        BUILD_CMD="buildah"
                                    fi
                                    
                                    echo "Using build command: $BUILD_CMD"
                                    
                                    # Build the image
                                    if [ "$BUILD_CMD" = "buildah" ]; then
                                        buildah bud --tls-verify=false -f Containerfile -t ${FRONTEND_IMAGE} .
                                    else
                                        $BUILD_CMD build --no-cache -f Containerfile -t ${FRONTEND_IMAGE} .
                                    fi
                                    
                                    # Login to registry
                                    echo "Logging into Quay.io..."
                                    if [ "$BUILD_CMD" = "buildah" ]; then
                                        buildah login -u $QUAY_USER -p $QUAY_PASS quay.io --tls-verify=false
                                        buildah push --tls-verify=false ${FRONTEND_IMAGE}
                                    else
                                        echo $QUAY_PASS | $BUILD_CMD login --username $QUAY_USER --password-stdin quay.io
                                        $BUILD_CMD push ${FRONTEND_IMAGE}
                                    fi
                                    
                                    echo "Frontend image built and pushed successfully"
                                '''
                            }
                        }
                    }
                }
                
                stage('Build Backend Image') {
                    steps {
                        script {
                            withCredentials([usernamePassword(credentialsId: "${REGISTRY_CREDENTIALS}", passwordVariable: 'QUAY_PASS', usernameVariable: 'QUAY_USER')]) {
                                sh '''
                                    echo "Building backend image with Docker/Podman..."
                                    cd backend
                                    
                                    # Check if we have Docker or Podman
                                    if command -v podman &> /dev/null; then
                                        BUILD_CMD="podman"
                                    elif command -v docker &> /dev/null; then
                                        BUILD_CMD="docker"
                                    else
                                        echo "Neither Docker nor Podman found, trying buildah..."
                                        BUILD_CMD="buildah"
                                    fi
                                    
                                    echo "Using build command: $BUILD_CMD"
                                    
                                    # Build the image
                                    if [ "$BUILD_CMD" = "buildah" ]; then
                                        buildah bud --tls-verify=false -f Containerfile -t ${BACKEND_IMAGE} .
                                    else
                                        $BUILD_CMD build --no-cache -f Containerfile -t ${BACKEND_IMAGE} .
                                    fi
                                    
                                    # Login to registry
                                    echo "Logging into Quay.io..."
                                    if [ "$BUILD_CMD" = "buildah" ]; then
                                        buildah login -u $QUAY_USER -p $QUAY_PASS quay.io --tls-verify=false
                                        buildah push --tls-verify=false ${BACKEND_IMAGE}
                                    else
                                        echo $QUAY_PASS | $BUILD_CMD login --username $QUAY_USER --password-stdin quay.io
                                        $BUILD_CMD push ${BACKEND_IMAGE}
                                    fi
                                    
                                    echo "Backend image built and pushed successfully"
                                '''
                            }
                        }
                    }
                }
            }
        }

        stage('Deploy Applications') {
            steps {
                withCredentials([string(credentialsId: 'oc-token-id', variable: 'OC_TOKEN')]) {
                    sh '''
                        echo "Deploying apps to OpenShift..."
                        oc login --token=$OC_TOKEN --server=${OPENSHIFT_SERVER} --insecure-skip-tls-verify
                        oc project ${PROJECT_NAME}

                        # Clean up existing deployments
                        oc delete all -l app=job-frontend --insecure-skip-tls-verify || true
                        oc delete all -l app=job-backend --insecure-skip-tls-verify || true
                        
                        # Wait a bit for cleanup
                        sleep 10

                        # Deploy frontend
                        echo "Deploying frontend..."
                        oc new-app ${FRONTEND_IMAGE} --name=job-frontend --insecure-skip-tls-verify
                        oc expose svc/job-frontend --insecure-skip-tls-verify

                        # Deploy backend
                        echo "Deploying backend..."
                        oc new-app ${BACKEND_IMAGE} --name=job-backend --insecure-skip-tls-verify
                        oc expose svc/job-backend --insecure-skip-tls-verify
                        
                        # Show deployment status
                        echo "Deployment status:"
                        oc get pods --insecure-skip-tls-verify
                        oc get svc --insecure-skip-tls-verify
                        oc get routes --insecure-skip-tls-verify
                    '''
                }
            }
        }
    }
    
    post {
        always {
            script {
                // Clean up local images if using Docker/Podman
                sh '''
                    if command -v podman &> /dev/null; then
                        podman rmi ${FRONTEND_IMAGE} ${BACKEND_IMAGE} || true
                    elif command -v docker &> /dev/null; then
                        docker rmi ${FRONTEND_IMAGE} ${BACKEND_IMAGE} || true
                    fi
                '''
            }
        }
        success {
            echo 'Pipeline completed successfully!'
        }
        failure {
            echo 'Pipeline failed. Check the logs for details.'
        }
    }
}