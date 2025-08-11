pipeline {
    agent any

    environment {
        // Registry info
        REGISTRY_URL = "quay.io"
        QUAY_NAMESPACE = "bilelrifi"
        FRONTEND_IMAGE = "${REGISTRY_URL}/${QUAY_NAMESPACE}/job-portal-frontend:latest"
        BACKEND_IMAGE = "${REGISTRY_URL}/${QUAY_NAMESPACE}/job-portal-backend:latest"

        // OpenShift namespace
        OPENSHIFT_PROJECT = "gamma"

        // Credentials IDs in Jenkins
        REGISTRY_CREDENTIALS = "ce45edfb-ce9a-42be-aa16-afea0bdc5dfc"
        OPENSHIFT_CREDENTIALS = "oc-token-id"
    }

    stages {

        stage('Login to OpenShift') {
            steps {
                withCredentials([string(credentialsId: "${OPENSHIFT_CREDENTIALS}", variable: 'OC_TOKEN')]) {
                    sh '''
                        oc login --token=$OC_TOKEN --server=https://api.your-openshift-cluster:6443
                        oc project ${OPENSHIFT_PROJECT}
                    '''
                }
            }
        }

        stage('Build and Push Images') {
            parallel {
                
                stage('Frontend Build') {
                    steps {
                        withCredentials([usernamePassword(credentialsId: "${REGISTRY_CREDENTIALS}", passwordVariable: 'QUAY_PASS', usernameVariable: 'QUAY_USER')]) {
                            sh '''
                                echo "Creating ephemeral build pod for Frontend..."
                                oc run frontend-builder --image=quay.io/buildah/stable --restart=Never --command -- bash -c "sleep 99999" >/dev/null 2>&1 &

                                echo "Waiting for pod to be ready..."
                                oc wait --for=condition=Ready pod/frontend-builder --timeout=300s

                                echo "Copying source code..."
                                oc rsync ./frontend frontend-builder:/workspace

                                echo "Building image..."
                                oc exec frontend-builder -- buildah bud --tls-verify=false -f /workspace/Containerfile -t ${FRONTEND_IMAGE} /workspace

                                echo "Logging into Quay..."
                                oc exec frontend-builder -- buildah login -u $QUAY_USER -p $QUAY_PASS ${REGISTRY_URL}

                                echo "Pushing image..."
                                oc exec frontend-builder -- buildah push --tls-verify=false ${FRONTEND_IMAGE}

                                echo "Cleaning up..."
                                oc delete pod frontend-builder
                            '''
                        }
                    }
                }

                stage('Backend Build') {
                    steps {
                        withCredentials([usernamePassword(credentialsId: "${REGISTRY_CREDENTIALS}", passwordVariable: 'QUAY_PASS', usernameVariable: 'QUAY_USER')]) {
                            sh '''
                                echo "Creating ephemeral build pod for Backend..."
                                oc run backend-builder --image=quay.io/buildah/stable --restart=Never --command -- bash -c "sleep 99999" >/dev/null 2>&1 &

                                echo "Waiting for pod to be ready..."
                                oc wait --for=condition=Ready pod/backend-builder --timeout=300s

                                echo "Copying source code..."
                                oc rsync ./backend backend-builder:/workspace

                                echo "Building image..."
                                oc exec backend-builder -- buildah bud --tls-verify=false -f /workspace/Containerfile -t ${BACKEND_IMAGE} /workspace

                                echo "Logging into Quay..."
                                oc exec backend-builder -- buildah login -u $QUAY_USER -p $QUAY_PASS ${REGISTRY_URL}

                                echo "Pushing image..."
                                oc exec backend-builder -- buildah push --tls-verify=false ${BACKEND_IMAGE}

                                echo "Cleaning up..."
                                oc delete pod backend-builder
                            '''
                        }
                    }
                }
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    echo "Deploying updated images to OpenShift..."
                    oc set image deployment/job-portal-frontend frontend=${FRONTEND_IMAGE} --record
                    oc set image deployment/job-portal-backend backend=${BACKEND_IMAGE} --record
                    oc rollout status deployment/job-portal-frontend
                    oc rollout status deployment/job-portal-backend
                '''
            }
        }
    }
}
