pipeline {
    agent any

    parameters {
        booleanParam(name: 'PUSH_TO_QUAY', defaultValue: true, description: 'Push built images to Quay.io registry')
        string(name: 'IMAGE_TAG', defaultValue: 'latest', description: 'Tag for the built images')
    }

    environment {
        PROJECT_NAME = "gamma"
        OPENSHIFT_SERVER = "https://api.ocp.smartek.ae:6443"
        
        // Image tags
        FRONTEND_IMAGE_TAG = "${params.IMAGE_TAG ?: 'latest'}"
        BACKEND_IMAGE_TAG = "${params.IMAGE_TAG ?: 'latest'}"
        
        FRONTEND_CONTEXT = "frontend"
        BACKEND_CONTEXT = "backend"
        
        // Quay.io registry details
        EXTERNAL_REGISTRY = "quay.io/bilelrifi"
        REGISTRY_CREDENTIALS = 'ce45edfb-ce9a-42be-aa16-afea0bdc5dfc'  // Robot account credentials
    }

    stages {
        stage('Clone Repo') {
            steps {
                checkout scm
            }
        }

        stage('Login to OpenShift') {
            steps {
                // Option 1: Using Token (recommended)
                withCredentials([string(credentialsId: 'oc-token-id', variable: 'OC_TOKEN')]) {
                    sh """
                        echo "Logging into OpenShift with token..."
                        oc login --token=\$OC_TOKEN --server=${OPENSHIFT_SERVER} --insecure-skip-tls-verify
                        oc project ${PROJECT_NAME}
                        echo "Successfully logged in and switched to project: ${PROJECT_NAME}"
                    """
                }
                
                // Option 2: Using Username/Password (uncomment if you prefer this)
                /*
                withCredentials([usernamePassword(credentialsId: 'oc-user-pass', passwordVariable: 'OC_PASS', usernameVariable: 'OC_USER')]) {
                    sh """
                        echo "Logging into OpenShift with username/password..."
                        oc login --username=\$OC_USER --password=\$OC_PASS --server=${OPENSHIFT_SERVER} --insecure-skip-tls-verify
                        oc project ${PROJECT_NAME}
                        echo "Successfully logged in and switched to project: ${PROJECT_NAME}"
                    """
                }
                */
            }
        }

        stage('Build Frontend Image') {
            steps {
                script {
                    sh """
                        # Create BuildConfig if it doesn't exist
                        if ! oc get bc job-portal-frontend; then
                            echo "Creating BuildConfig for frontend..."
                            oc new-build --name=job-portal-frontend --binary=true --strategy=docker
                        fi
                        
                        # Start build from local directory
                        echo "Building frontend image..."
                        oc start-build job-portal-frontend --from-dir=${FRONTEND_CONTEXT} --follow --wait
                    """
                }
            }
        }

        stage('Build Backend Image') {
            steps {
                script {
                    sh """
                        # Create BuildConfig if it doesn't exist
                        if ! oc get bc job-portal-backend; then
                            echo "Creating BuildConfig for backend..."
                            oc new-build --name=job-portal-backend --binary=true --strategy=docker
                        fi
                        
                        # Start build from local directory
                        echo "Building backend image..."
                        oc start-build job-portal-backend --from-dir=${BACKEND_CONTEXT} --follow --wait
                    """
                }
            }
        }

        stage('Tag Images') {
            steps {
                sh """
                    # Tag the built images
                    oc tag ${PROJECT_NAME}/job-portal-frontend:latest ${PROJECT_NAME}/job-portal-frontend:${FRONTEND_IMAGE_TAG}
                    oc tag ${PROJECT_NAME}/job-portal-backend:latest ${PROJECT_NAME}/job-portal-backend:${BACKEND_IMAGE_TAG}
                """
            }
        }

        stage('Push to Quay.io') {
            when {
                expression { params.PUSH_TO_QUAY == true }
            }
            steps {
                withCredentials([usernamePassword(credentialsId: "${REGISTRY_CREDENTIALS}", passwordVariable: 'QUAY_ROBOT_TOKEN', usernameVariable: 'QUAY_ROBOT_USER')]) {
                    sh """
                        echo "Pushing images to Quay.io using robot account: \$QUAY_ROBOT_USER"
                        
                        # Create a secret for Quay.io authentication
                        oc create secret docker-registry quay-robot-secret \
                            --docker-server=quay.io \
                            --docker-username=\$QUAY_ROBOT_USER \
                            --docker-password=\$QUAY_ROBOT_TOKEN \
                            --dry-run=client -o yaml | oc apply -f -
                        
                        # Create temporary docker config for image mirroring
                        mkdir -p /tmp/docker-config
                        oc extract secret/quay-robot-secret --keys=.dockerconfigjson --to=/tmp/docker-config/ || true
                        
                        # Mirror images to Quay.io
                        oc image mirror \
                            ${PROJECT_NAME}/job-portal-frontend:${FRONTEND_IMAGE_TAG} \
                            ${EXTERNAL_REGISTRY}/job-portal-frontend:${FRONTEND_IMAGE_TAG} \
                            --registry-config=/tmp/docker-config/.dockerconfigjson
                        
                        oc image mirror \
                            ${PROJECT_NAME}/job-portal-backend:${BACKEND_IMAGE_TAG} \
                            ${EXTERNAL_REGISTRY}/job-portal-backend:${BACKEND_IMAGE_TAG} \
                            --registry-config=/tmp/docker-config/.dockerconfigjson
                        
                        # Clean up temporary files
                        rm -rf /tmp/docker-config
                        
                        echo "✅ Images successfully pushed to Quay.io:"
                        echo "   Frontend: ${EXTERNAL_REGISTRY}/job-portal-frontend:${FRONTEND_IMAGE_TAG}"
                        echo "   Backend: ${EXTERNAL_REGISTRY}/job-portal-backend:${BACKEND_IMAGE_TAG}"
                    """
                }
            }
        }

        stage('Deploy Applications') {
            steps {
                sh """
                    # Clean existing deployments (ignore errors)
                    oc delete all -l app=job-frontend || true
                    oc delete all -l app=job-backend || true
                    
                    # Deploy frontend using the built image
                    oc new-app job-portal-frontend:${FRONTEND_IMAGE_TAG} --name=job-frontend
                    oc expose svc/job-frontend
                    
                    # Deploy backend using the built image
                    oc new-app job-portal-backend:${BACKEND_IMAGE_TAG} --name=job-backend
                    oc expose svc/job-backend
                    
                    # Wait for deployments to be ready
                    oc rollout status deployment/job-frontend --timeout=300s
                    oc rollout status deployment/job-backend --timeout=300s
                    
                    # Get the routes
                    echo "Frontend Route:"
                    oc get route job-frontend --template='{{ .spec.host }}'
                    echo ""
                    echo "Backend Route:"
                    oc get route job-backend --template='{{ .spec.host }}'
                """
            }
        }
    }

    post {
        always {
            script {
                // Clean up build artifacts if needed
                sh """
                    echo "Pipeline completed"
                    oc get pods -l openshift.io/build.name | grep -E "(job-portal-frontend|job-portal-backend)" || true
                """
            }
        }
        success {
            echo "Pipeline completed successfully!"
        }
        failure {
            echo "Pipeline failed. Check the logs above for details."
        }
    }
}