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
                withCredentials([string(credentialsId: 'oc-token-id', variable: 'OC_TOKEN')]) {
                    sh '''
                        echo "Logging into OpenShift with token..."
                        echo "Token length: ${#OC_TOKEN}"
                        oc login --token=$OC_TOKEN --server=https://api.ocp.smartek.ae:6443 --insecure-skip-tls-verify
                        oc project gamma
                        echo "Successfully logged in and switched to project: gamma"
                        oc whoami
                        oc project
                    '''
                }
            }
        }

        stage('Build Frontend Image') {
            steps {
                script {
                    sh '''
                        # Create BuildConfig if it doesn't exist
                        if ! oc get bc job-portal-frontend; then
                            echo "Creating BuildConfig for frontend..."
                            oc new-build --name=job-portal-frontend --binary=true --strategy=docker
                        fi
                        
                        # Start build from local directory
                        echo "Building frontend image..."
                        oc start-build job-portal-frontend --from-dir=frontend --follow --wait
                    '''
                }
            }
        }

        stage('Build Backend Image') {
            steps {
                script {
                    sh '''
                        # Create BuildConfig if it doesn't exist
                        if ! oc get bc job-portal-backend; then
                            echo "Creating BuildConfig for backend..."
                            oc new-build --name=job-portal-backend --binary=true --strategy=docker
                        fi
                        
                        # Start build from local directory
                        echo "Building backend image..."
                        oc start-build job-portal-backend --from-dir=backend --follow --wait
                    '''
                }
            }
        }

        stage('Tag Images') {
            steps {
                sh '''
                    # Tag the built images
                    oc tag gamma/job-portal-frontend:latest gamma/job-portal-frontend:latest
                    oc tag gamma/job-portal-backend:latest gamma/job-portal-backend:latest
                '''
            }
        }

        stage('Push to Quay.io') {
            when {
                expression { params.PUSH_TO_QUAY == true }
            }
            steps {
                withCredentials([usernamePassword(credentialsId: 'ce45edfb-ce9a-42be-aa16-afea0bdc5dfc', passwordVariable: 'QUAY_ROBOT_TOKEN', usernameVariable: 'QUAY_ROBOT_USER')]) {
                    sh '''
                        echo "Pushing images to Quay.io using robot account: $QUAY_ROBOT_USER"
                        
                        # Create a secret for Quay.io authentication
                        oc create secret docker-registry quay-robot-secret \
                            --docker-server=quay.io \
                            --docker-username=$QUAY_ROBOT_USER \
                            --docker-password=$QUAY_ROBOT_TOKEN \
                            --dry-run=client -o yaml | oc apply -f -
                        
                        # Create temporary docker config for image mirroring
                        mkdir -p /tmp/docker-config
                        oc extract secret/quay-robot-secret --keys=.dockerconfigjson --to=/tmp/docker-config/ || true
                        
                        # Mirror images to Quay.io
                        oc image mirror \
                            gamma/job-portal-frontend:latest \
                            quay.io/bilelrifi/job-portal-frontend:latest \
                            --registry-config=/tmp/docker-config/.dockerconfigjson
                        
                        oc image mirror \
                            gamma/job-portal-backend:latest \
                            quay.io/bilelrifi/job-portal-backend:latest \
                            --registry-config=/tmp/docker-config/.dockerconfigjson
                        
                        # Clean up temporary files
                        rm -rf /tmp/docker-config
                        
                        echo "✅ Images successfully pushed to Quay.io:"
                        echo "   Frontend: quay.io/bilelrifi/job-portal-frontend:latest"
                        echo "   Backend: quay.io/bilelrifi/job-portal-backend:latest"
                    '''
                }
            }
        }

        stage('Deploy Applications') {
            steps {
                sh '''
                    # Clean existing deployments (ignore errors)
                    oc delete all -l app=job-frontend || true
                    oc delete all -l app=job-backend || true
                    
                    # Deploy frontend using the built image
                    oc new-app job-portal-frontend:latest --name=job-frontend
                    oc expose svc/job-frontend
                    
                    # Deploy backend using the built image
                    oc new-app job-portal-backend:latest --name=job-backend
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
                '''
            }
        }
    }

    post {
        always {
            script {
                sh '''
                    echo "Pipeline completed"
                    oc get pods -l openshift.io/build.name | grep -E "(job-portal-frontend|job-portal-backend)" || true
                '''
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