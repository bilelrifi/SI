pipeline {
    agent any

    environment {
        PROJECT_NAME = "gamma"
        OPENSHIFT_SERVER = "https://api.ocp.smartek.ae:6443"
        REGISTRY_CREDENTIALS = 'ce45edfb-ce9a-42be-aa16-afea0bdc5dfc'
        
        // Use dynamic tags based on build number for better versioning
        FRONTEND_IMAGE = "quay.io/bilelrifi/job-portal-frontend:${BUILD_NUMBER}"
        BACKEND_IMAGE = "quay.io/bilelrifi/job-portal-backend:${BUILD_NUMBER}"
    }

    stages {
        stage('Clone Repo') {
            steps {
                checkout scm
            }
        }

        stage('Build and Push Frontend to Quay') {
            steps {
                withCredentials([usernamePassword(credentialsId: "${REGISTRY_CREDENTIALS}", passwordVariable: 'QUAY_PASS', usernameVariable: 'QUAY_USER')]) {
                    sh '''
                        echo "Logging into Quay.io..."
                        podman login quay.io -u $QUAY_USER -p $QUAY_PASS
                        
                        echo "Building and pushing frontend image..."
                        cd frontend
                        podman build -t ${FRONTEND_IMAGE} .
                        podman push ${FRONTEND_IMAGE}
                        
                        # Also tag as latest for convenience
                        podman tag ${FRONTEND_IMAGE} quay.io/bilelrifi/job-portal-frontend:latest
                        podman push quay.io/bilelrifi/job-portal-frontend:latest
                    '''
                }
            }
        }

        stage('Build and Push Backend to Quay') {
            steps {
                withCredentials([usernamePassword(credentialsId: "${REGISTRY_CREDENTIALS}", passwordVariable: 'QUAY_PASS', usernameVariable: 'QUAY_USER')]) {
                    sh '''
                        echo "Building and pushing backend image..."
                        cd backend
                        podman build -t ${BACKEND_IMAGE} .
                        podman push ${BACKEND_IMAGE}
                        
                        # Also tag as latest for convenience
                        podman tag ${BACKEND_IMAGE} quay.io/bilelrifi/job-portal-backend:latest
                        podman push quay.io/bilelrifi/job-portal-backend:latest
                    '''
                }
            }
        }

        stage('Login to OpenShift') {
            steps {
                withCredentials([string(credentialsId: 'oc-token-id', variable: 'OC_TOKEN')]) {
                    sh '''
                        echo "Logging into OpenShift with token..."
                        oc login --token=$OC_TOKEN --server=${OPENSHIFT_SERVER} --insecure-skip-tls-verify
                        oc project ${PROJECT_NAME}
                        echo "Successfully logged in to project: ${PROJECT_NAME}"
                    '''
                }
            }
        }

        stage('Create Quay Pull Secret') {
            steps {
                withCredentials([usernamePassword(credentialsId: "${REGISTRY_CREDENTIALS}", passwordVariable: 'QUAY_PASS', usernameVariable: 'QUAY_USER')]) {
                    sh '''
                        echo "Creating/updating Quay pull secret..."
                        oc delete secret quay-pull-secret || true
                        oc create secret docker-registry quay-pull-secret \
                            --docker-server=quay.io \
                            --docker-username=$QUAY_USER \
                            --docker-password=$QUAY_PASS \
                            --docker-email=noreply@example.com
                        
                        # Link the secret to the default service account for pulling images
                        oc secrets link default quay-pull-secret --for=pull
                    '''
                }
            }
        }

        stage('Deploy Applications') {
            steps {
                sh '''
                    echo "Deploying applications from Quay images..."
                    
                    # Clean up existing deployments
                    oc delete all -l app=job-frontend || true
                    oc delete all -l app=job-backend || true
                    
                    # Deploy frontend from Quay
                    echo "Deploying frontend from ${FRONTEND_IMAGE}..."
                    oc new-app ${FRONTEND_IMAGE} --name=job-frontend
                    oc expose svc/job-frontend
                    
                    # Deploy backend from Quay
                    echo "Deploying backend from ${BACKEND_IMAGE}..."
                    oc new-app ${BACKEND_IMAGE} --name=job-backend
                    oc expose svc/job-backend
                    
                    # Wait for deployments to be ready
                    echo "Waiting for deployments to be ready..."
                    oc rollout status deployment/job-frontend --timeout=300s
                    oc rollout status deployment/job-backend --timeout=300s
                    
                    echo "Deployment completed successfully!"
                '''
            }
        }
    }
    
    post {
        always {
            sh '''
                echo "Cleaning up local images..."
                podman rmi ${FRONTEND_IMAGE} || true
                podman rmi ${BACKEND_IMAGE} || true
                podman rmi quay.io/bilelrifi/job-portal-frontend:latest || true
                podman rmi quay.io/bilelrifi/job-portal-backend:latest || true
            '''
        }
        success {
            echo "Pipeline completed successfully! Images pushed to Quay and deployed to OpenShift."
        }
        failure {
            echo "Pipeline failed. Check the logs for details."
        }
    }
}