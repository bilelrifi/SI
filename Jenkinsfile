pipeline {
    agent {
        // You'll need to use a Jenkins agent with Buildah installed.
        // A custom Docker agent or an agent with a toolchain might be necessary.
        label 'buildah-agent' 
    }

    environment {
        PROJECT_NAME = "gamma"
        OPENSHIFT_SERVER = "https://api.ocp.smartek.ae:6443"

        // The credentials for your Quay.io robot account.
        QUAY_CREDENTIALS_ID = 'ce45edfb-ce9a-42be-aa16-afea0bdc5dfc'
        OC_TOKEN_ID = 'oc-token-id'

        // Quay.io image locations
        FRONTEND_IMAGE = "quay.io/bilelrifi/job-portal-frontend:p"
        BACKEND_IMAGE = "quay.io/bilelrifi/job-portal-backend:p"
    }

    stages {
        stage('Clone Repo') {
            steps {
                checkout scm
            }
        }

        stage('Login to OpenShift & Quay.io') {
            steps {
                withCredentials([string(credentialsId: "${OC_TOKEN_ID}", variable: 'OC_TOKEN'), 
                                 usernamePassword(credentialsId: "${QUAY_CREDENTIALS_ID}", usernameVariable: 'QUAY_USER', passwordVariable: 'QUAY_PASS')]) {
                    sh '''
                        echo "Logging into OpenShift with token..."
                        oc login --token=$OC_TOKEN --server=${OPENSHIFT_SERVER} --insecure-skip-tls-verify
                        oc project ${PROJECT_NAME}
                        echo "Successfully logged in to project: ${PROJECT_NAME}"

                        echo "Logging into Quay.io with robot account..."
                        # Login with Buildah
                        buildah login -u $QUAY_USER -p $QUAY_PASS quay.io --tls-verify=false
                    '''
                }
            }
        }

        stage('Build and Push Frontend Image') {
            steps {
                withCredentials([usernamePassword(credentialsId: "${QUAY_CREDENTIALS_ID}", usernameVariable: 'QUAY_USER', passwordVariable: 'QUAY_PASS')]) {
                    sh '''
                        echo "Building frontend image with Buildah..."
                        # Use Buildah to build the image from the frontend directory
                        buildah bud -f ./frontend/Dockerfile -t ${FRONTEND_IMAGE} ./frontend
                        
                        echo "Pushing frontend image to Quay.io..."
                        buildah push --tls-verify=false ${FRONTEND_IMAGE}
                    '''
                }
            }
        }

        stage('Build and Push Backend Image') {
            steps {
                withCredentials([usernamePassword(credentialsId: "${QUAY_CREDENTIALS_ID}", usernameVariable: 'QUAY_USER', passwordVariable: 'QUAY_PASS')]) {
                    sh '''
                        echo "Building backend image with Buildah..."
                        # Use Buildah to build the image from the backend directory
                        buildah bud -f ./backend/Dockerfile -t ${BACKEND_IMAGE} ./backend

                        echo "Pushing backend image to Quay.io..."
                        buildah push --tls-verify=false ${BACKEND_IMAGE}
                    '''
                }
            }
        }

        stage('Deploy Applications') {
            steps {
                withCredentials([string(credentialsId: "${OC_TOKEN_ID}", variable: 'OC_TOKEN')]) {
                    sh '''
                        echo "Deploying applications to OpenShift from Quay.io..."
                        oc login --token=$OC_TOKEN --server=${OPENSHIFT_SERVER} --insecure-skip-tls-verify
                        oc project ${PROJECT_NAME}

                        # Delete old resources
                        oc delete all -l app=job-frontend --insecure-skip-tls-verify || true
                        oc delete all -l app=job-backend --insecure-skip-tls-verify || true

                        # Deploy new apps from the Quay.io images
                        oc new-app ${FRONTEND_IMAGE} --name=job-frontend --insecure-skip-tls-verify
                        oc expose svc/job-frontend --insecure-skip-tls-verify

                        oc new-app ${BACKEND_IMAGE} --name=job-backend --insecure-skip-tls-verify
                        oc expose svc/job-backend --insecure-skip-tls-verify
                    '''
                }
            }
        }
    }
}