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

        stage('Build Images on OpenShift') {
            parallel {
                stage('Build Frontend Image') {
                    steps {
                        script {
                            withCredentials([usernamePassword(credentialsId: "${REGISTRY_CREDENTIALS}", passwordVariable: 'QUAY_PASS', usernameVariable: 'QUAY_USER')]) {
                                sh '''
                                    echo "Building frontend image on OpenShift..."
                                    cd frontend

                                    # Delete any old build configs
                                    oc delete bc job-portal-frontend --ignore-not-found=true
                                    oc delete is job-portal-frontend --ignore-not-found=true

                                    # Create new build config
                                    oc new-build --name=job-portal-frontend --binary --strategy=docker

                                    # Start the build from local directory
                                    oc start-build job-portal-frontend --from-dir=. --follow

                                    # Tag and push to Quay
                                    echo "Tagging image to Quay..."
                                    oc tag job-portal-frontend:latest ${FRONTEND_IMAGE}

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
                                    echo "Building backend image on OpenShift..."
                                    cd backend

                                    # Delete any old build configs
                                    oc delete bc job-portal-backend --ignore-not-found=true
                                    oc delete is job-portal-backend --ignore-not-found=true

                                    # Create new build config
                                    oc new-build --name=job-portal-backend --binary --strategy=docker

                                    # Start the build from local directory
                                    oc start-build job-portal-backend --from-dir=. --follow

                                    # Tag and push to Quay
                                    echo "Tagging image to Quay..."
                                    oc tag job-portal-backend:latest ${BACKEND_IMAGE}

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
                        oc delete all -l app=job-frontend --ignore-not-found=true
                        oc delete all -l app=job-backend --ignore-not-found=true
                        
                        sleep 10

                        # Deploy frontend
                        echo "Deploying frontend..."
                        oc new-app ${FRONTEND_IMAGE} --name=job-frontend
                        oc expose svc/job-frontend

                        # Deploy backend
                        echo "Deploying backend..."
                        oc new-app ${BACKEND_IMAGE} --name=job-backend
                        oc expose svc/job-backend
                        
                        # Show deployment status
                        echo "Deployment status:"
                        oc get pods
                        oc get svc
                        oc get routes
                    '''
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
